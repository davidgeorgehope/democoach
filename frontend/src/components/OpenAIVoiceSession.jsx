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

  const addTranscriptEntry = useCallback((speaker, text) => {
    setTranscript(prev => [...prev, {
      speaker,
      text,
      timestamp: Date.now(),
    }])
  }, [])

  const startSession = useCallback(async () => {
    try {
      // Get microphone first before creating peer connection
      const constraints = selectedDeviceId
        ? { audio: { deviceId: { exact: selectedDeviceId } } }
        : { audio: true }
      const ms = await navigator.mediaDevices.getUserMedia(constraints)
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
        // Don't send session.update here - wait for connection to stabilize
      }

      // Wait for WebRTC connection to stabilize before sending session.update
      // This is critical - sending config too early can cause it to be ignored
      pc.onconnectionstatechange = () => {
        console.log('[OpenAI] Connection state:', pc.connectionState)

        if (pc.connectionState === 'connected') {
          if (hasGreeted.current) return // Prevent duplicate greetings
          hasGreeted.current = true

          setAgentStatus('connected')
          startTimeRef.current = Date.now()

          // Send session config with the roleplay instructions
          // Prepend strong language instruction to prevent wrong language
          const fullInstructions = `CRITICAL: You MUST respond ONLY in English. Never speak any other language.

${systemPrompt}`

          // Note: Do NOT include input_audio_format/output_audio_format
          // WebRTC uses Opus codec automatically. Setting pcm16 is for WebSocket only.
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
          console.log('[OpenAI] Sending session config with instructions:', fullInstructions.substring(0, 200) + '...')
          dc.send(JSON.stringify(config))

          // Wait for session.updated confirmation before triggering response
          // The response.create will be sent when we receive session.updated event
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
          case 'session.created':
            console.log('[OpenAI] Session created, waiting for our config to be applied...')
            break
          case 'session.updated':
            console.log('[OpenAI] Session config applied! Now triggering initial response...')
            // NOW it's safe to trigger the greeting
            dc.send(JSON.stringify({
              type: 'response.create',
            }))
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
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

    } catch (err) {
      console.error('OpenAI Realtime error:', err)
      setError(err.message || 'Failed to connect')
      setAgentStatus('error')
    }
  }, [token, persona, systemPrompt, selectedDeviceId, addTranscriptEntry])

  const endSession = useCallback(() => {
    console.log('[OpenAI] Ending session - cleaning up...')
    hasGreeted.current = false

    // 1. Cancel any in-progress AI response first
    if (dcRef.current?.readyState === 'open') {
      console.log('[OpenAI] Sending response.cancel')
      try {
        dcRef.current.send(JSON.stringify({ type: 'response.cancel' }))
      } catch (e) {
        console.warn('[OpenAI] Error sending response.cancel:', e)
      }
    }

    // 2. Stop all microphone tracks
    if (mediaStreamRef.current) {
      console.log('[OpenAI] Stopping microphone tracks')
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      mediaStreamRef.current = null
    }

    // 3. Close data channel
    if (dcRef.current) {
      console.log('[OpenAI] Closing data channel')
      try {
        dcRef.current.close()
      } catch (e) {
        console.warn('[OpenAI] Error closing data channel:', e)
      }
      dcRef.current = null
    }

    // 4. Close peer connection - this should stop all media
    if (pcRef.current) {
      console.log('[OpenAI] Closing peer connection')
      try {
        // Stop all senders
        pcRef.current.getSenders().forEach(sender => {
          if (sender.track) {
            sender.track.stop()
          }
        })
        // Stop all receivers
        pcRef.current.getReceivers().forEach(receiver => {
          if (receiver.track) {
            receiver.track.stop()
          }
        })
        pcRef.current.close()
      } catch (e) {
        console.warn('[OpenAI] Error closing peer connection:', e)
      }
      pcRef.current = null
    }

    // 5. Stop audio playback
    if (audioRef.current) {
      console.log('[OpenAI] Stopping audio playback')
      audioRef.current.pause()
      audioRef.current.srcObject = null
      audioRef.current.remove()
      audioRef.current = null
    }

    // 6. Callback
    console.log('[OpenAI] Cleanup complete, calling onEnd')
    onEnd(transcript)
  }, [onEnd, transcript])

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

  // Start on mount
  useEffect(() => {
    if (token) {
      startSession()
    }
    return () => {
      // Cleanup on unmount - thorough cleanup in correct order
      console.log('[OpenAI] Unmounting - cleaning up')

      // 1. Cancel any in-progress response
      if (dcRef.current?.readyState === 'open') {
        try { dcRef.current.send(JSON.stringify({ type: 'response.cancel' })) } catch (e) {}
      }

      // 2. Stop microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          track.stop()
          track.enabled = false
        })
      }

      // 3. Close data channel
      if (dcRef.current) {
        try { dcRef.current.close() } catch (e) {}
      }

      // 4. Close peer connection
      if (pcRef.current) {
        try {
          pcRef.current.getSenders().forEach(s => s.track?.stop())
          pcRef.current.getReceivers().forEach(r => r.track?.stop())
          pcRef.current.close()
        } catch (e) {}
      }

      // 5. Stop audio playback
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.srcObject = null
        audioRef.current.remove()
      }
    }
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
