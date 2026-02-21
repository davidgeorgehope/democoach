import { useState, useCallback, useEffect, useRef } from 'react'
import LiveTranscript from './LiveTranscript'
import SessionTimer from './SessionTimer'
import { markMoment } from '../api'

export default function OpenAIVoiceSession({ token, sessionId, durationMinutes, persona, systemPrompt, onEnd, selectedDeviceId }) {
  const [transcript, setTranscript] = useState([])
  const [agentStatus, setAgentStatus] = useState('connecting')
  const [error, setError] = useState(null)
  const startTimeRef = useRef(null)
  const pcRef = useRef(null)
  const dcRef = useRef(null)
  const audioRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const hasGreeted = useRef(false)
  const sessionGenRef = useRef(0)  // Incremented on each cleanup to invalidate in-flight sessions

  const addTranscriptEntry = useCallback((speaker, text) => {
    setTranscript(prev => [...prev, {
      speaker,
      text,
      timestamp: Date.now(),
    }])
  }, [])

  // Centralized cleanup function - reused by endSession and unmount
  const cleanupConnection = useCallback(() => {
    console.log('[OpenAI] cleanupConnection called')

    // Invalidate any in-flight startSession calls
    sessionGenRef.current++

    // 1. Cancel any in-progress AI response first
    if (dcRef.current?.readyState === 'open') {
      try {
        dcRef.current.send(JSON.stringify({ type: 'response.cancel' }))
      } catch (e) {
        // Ignore errors during cleanup
      }
    }

    // 2. Stop all microphone tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      mediaStreamRef.current = null
    }

    // 3. Close data channel - null out handlers FIRST to stop events
    if (dcRef.current) {
      dcRef.current.onmessage = null
      dcRef.current.onerror = null
      dcRef.current.onopen = null
      try {
        dcRef.current.close()
      } catch (e) {
        // Ignore errors during cleanup
      }
      dcRef.current = null
    }

    // 4. Close peer connection - null out handlers FIRST
    if (pcRef.current) {
      pcRef.current.ontrack = null
      pcRef.current.onconnectionstatechange = null
      try {
        pcRef.current.getSenders().forEach(sender => {
          if (sender.track) sender.track.stop()
        })
        pcRef.current.getReceivers().forEach(receiver => {
          if (receiver.track) receiver.track.stop()
        })
        pcRef.current.close()
      } catch (e) {
        // Ignore errors during cleanup
      }
      pcRef.current = null
    }

    // 5. Stop audio playback - set srcObject to null BEFORE pause
    if (audioRef.current) {
      audioRef.current.srcObject = null
      audioRef.current.pause()
      audioRef.current = null
    }

    hasGreeted.current = false
  }, [])

  const startSession = useCallback(async () => {
    // Capture current generation - if cleanup runs during our async gaps,
    // sessionGenRef will increment and we know to bail out
    const myGen = sessionGenRef.current
    console.log('[OpenAI] startSession gen:', myGen)

    try {
      // Get microphone first before creating peer connection
      const constraints = selectedDeviceId
        ? { audio: { deviceId: { exact: selectedDeviceId } } }
        : { audio: true }
      const ms = await navigator.mediaDevices.getUserMedia(constraints)

      // Check if we were cancelled during getUserMedia
      if (sessionGenRef.current !== myGen) {
        console.log('[OpenAI] Session cancelled during getUserMedia, cleaning up')
        ms.getTracks().forEach(t => t.stop())
        return
      }
      mediaStreamRef.current = ms

      // Create peer connection
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // Set up audio element for playback
      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioRef.current = audioEl

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0]
      }

      // Add mic tracks
      ms.getTracks().forEach(track => pc.addTrack(track, ms))

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onopen = () => {
        console.log('[OpenAI] Data channel open')
      }

      pc.onconnectionstatechange = () => {
        console.log('[OpenAI] Connection state:', pc.connectionState)

        if (pc.connectionState === 'connected') {
          setAgentStatus('connected')
          startTimeRef.current = Date.now()
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.error('[OpenAI] Connection failed:', pc.connectionState)
          setError('WebRTC connection failed')
          setAgentStatus('error')
        }
      }

      dc.onmessage = (e) => {
        const event = JSON.parse(e.data)
        console.log('[OpenAI] Event:', event.type)

        switch (event.type) {
          case 'session.created': {
            // Data channel is guaranteed open since we received this message through it
            if (hasGreeted.current) break
            hasGreeted.current = true

            const fullInstructions = `CRITICAL: You MUST respond ONLY in English. Never speak any other language.

${systemPrompt}`

            const config = {
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: fullInstructions,
                voice: 'ash',
                turn_detection: { type: 'server_vad' },
                temperature: 0.8,
                input_audio_transcription: { model: 'whisper-1' },
              }
            }
            console.log('[OpenAI] Sending session config')
            dc.send(JSON.stringify(config))
            break
          }
          case 'session.updated':
            console.log('[OpenAI] Session config applied! Triggering initial response...')
            dc.send(JSON.stringify({ type: 'response.create' }))
            break
          case 'response.audio_transcript.done':
            addTranscriptEntry('agent', event.transcript)
            break
          case 'conversation.item.input_audio_transcription.completed':
            addTranscriptEntry('user', event.transcript)
            break
          case 'response.done':
            setAgentStatus('connected')
            break
          case 'input_audio_buffer.speech_started':
            setAgentStatus('listening')
            break
          case 'response.created':
            setAgentStatus('speaking')
            break
          case 'error':
            console.error('OpenAI Realtime error:', event.error)
            setError(event.error?.message || 'OpenAI error')
            break
        }
      }

      dc.onerror = (e) => {
        console.error('Data channel error:', e)
        setError('Connection error')
      }

      // Create and set local description
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Check if we were cancelled during offer creation
      if (sessionGenRef.current !== myGen) {
        console.log('[OpenAI] Session cancelled during offer, cleaning up')
        pc.close()
        ms.getTracks().forEach(t => t.stop())
        return
      }

      // Connect to OpenAI Realtime
      const baseUrl = 'https://api.openai.com/v1/realtime'
      const model = 'gpt-realtime'
      const response = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      })

      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.status}`)
      }

      const answerSdp = await response.text()

      // Check if we were cancelled during the fetch
      if (sessionGenRef.current !== myGen) {
        console.log('[OpenAI] Session cancelled during SDP exchange, cleaning up')
        pc.close()
        ms.getTracks().forEach(t => t.stop())
        return
      }

      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

    } catch (err) {
      if (err.name === 'AbortError') return  // Expected on cleanup
      console.error('OpenAI Realtime error:', err)
      setError(err.message || 'Failed to connect')
      setAgentStatus('error')
    }
  }, [token, persona, systemPrompt, selectedDeviceId, addTranscriptEntry])

  const endSession = useCallback(() => {
    console.log('[OpenAI] Ending session')
    cleanupConnection()
    onEnd(transcript)
  }, [cleanupConnection, onEnd, transcript])

  const handleMarkMoment = useCallback(async () => {
    if (!startTimeRef.current) return
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000)
    const lastAgent = [...transcript].reverse().find(t => t.speaker === 'agent')
    const lastUser = [...transcript].reverse().find(t => t.speaker === 'user')
    try {
      await markMoment(sessionId, {
        timestamp_seconds: elapsed,
        agent_text: lastAgent?.text || null,
        user_text: lastUser?.text || null,
      })
    } catch (e) {
      console.error('Failed to mark moment:', e)
    }
  }, [sessionId, transcript])

  // Start on mount - only react to token changes, not function references
  useEffect(() => {
    if (token) {
      startSession()
    }
    return () => {
      cleanupConnection()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const statusColors = {
    connecting: 'bg-warning animate-pulse',
    connected: 'bg-success',
    speaking: 'bg-primary animate-pulse',
    listening: 'bg-error animate-pulse',
    error: 'bg-error',
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-surface rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusColors[agentStatus] || statusColors.connecting}`} />
          <span className="text-sm text-text-secondary">
            {agentStatus === 'connecting' && 'Connecting to OpenAI...'}
            {agentStatus === 'connected' && 'Connected — waiting'}
            {agentStatus === 'speaking' && `${persona?.name || 'Agent'} is speaking...`}
            {agentStatus === 'listening' && 'Listening to you...'}
            {agentStatus === 'error' && 'Connection error'}
          </span>
          <span className="text-xs text-primary font-medium ml-2">OpenAI Realtime</span>
        </div>

        {startTimeRef.current && (
          <SessionTimer
            durationMinutes={durationMinutes || 15}
            onTimeUp={endSession}
          />
        )}
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 min-h-0">
        <LiveTranscript messages={transcript} persona={persona} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 bg-surface rounded-lg p-4">
        <button
          onClick={handleMarkMoment}
          className="px-4 py-2 bg-warning/20 text-warning rounded-lg text-sm font-medium hover:bg-warning/30 transition-colors"
        >
          Mark Moment
        </button>
        <div className="flex-1" />
        <button
          onClick={endSession}
          className="px-6 py-2 bg-error/20 text-error rounded-lg text-sm font-medium hover:bg-error/30 transition-colors"
        >
          End Session
        </button>
      </div>
    </div>
  )
}
