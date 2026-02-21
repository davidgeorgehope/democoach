import { useConversation } from '@elevenlabs/react'
import { useState, useCallback, useEffect, useRef } from 'react'
import LiveTranscript from './LiveTranscript'
import SessionTimer from './SessionTimer'
import CoachingIndicators from './CoachingIndicators'
import { markMoment } from '../api'

export default function VoiceSession({ signedUrl, sessionId, durationMinutes, persona, onEnd, selectedDeviceId }) {
  const [transcript, setTranscript] = useState([])
  const [agentStatus, setAgentStatus] = useState('idle')
  const [started, setStarted] = useState(false)
  const [error, setError] = useState(null)
  const startTimeRef = useRef(null)

  const conversation = useConversation({
    onConnect: () => {
      setAgentStatus('connected')
      setStarted(true)
      startTimeRef.current = Date.now()
    },
    onDisconnect: () => {
      setAgentStatus('idle')
    },
    onMessage: ({ message, source }) => {
      setTranscript(prev => [...prev, {
        speaker: source === 'ai' ? 'agent' : 'user',
        text: message,
        timestamp: Date.now(),
      }])
    },
    onStatusChange: ({ status }) => {
      setAgentStatus(status)
    },
    onError: (err) => {
      console.error('ElevenLabs error:', err)
      setError(err.message || 'Voice connection error')
    },
  })

  const startConversation = useCallback(async () => {
    setError(null)
    try {
      // Request mic permission first
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // Start session with the selected input device
      const sessionOptions = { signedUrl }
      if (selectedDeviceId) {
        sessionOptions.inputDeviceId = selectedDeviceId
        console.log('Starting session with device:', selectedDeviceId)
      }
      await conversation.startSession(sessionOptions)
    } catch (err) {
      console.error('Start session error:', err)
      setError(err.message || 'Failed to start — check microphone permissions')
    }
  }, [conversation, signedUrl, selectedDeviceId])

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession()
    } catch (e) {
      // ignore
    }
    onEnd(transcript)
  }, [conversation, onEnd, transcript])

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

  // Auto-start on mount
  useEffect(() => {
    if (signedUrl && !started) {
      startConversation()
    }
  }, [signedUrl])

  const statusColors = {
    idle: 'bg-text-secondary',
    connected: 'bg-success',
    speaking: 'bg-primary animate-pulse',
    listening: 'bg-error animate-pulse',
    thinking: 'bg-warning animate-pulse',
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-surface rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusColors[agentStatus] || statusColors.idle}`} />
          <span className="text-sm text-text-secondary">
            {agentStatus === 'idle' && !started && 'Connecting...'}
            {agentStatus === 'connected' && 'Connected — waiting'}
            {agentStatus === 'speaking' && `${persona?.name || 'Agent'} is speaking...`}
            {agentStatus === 'listening' && 'Listening to you...'}
            {agentStatus === 'thinking' && 'Thinking...'}
          </span>
        </div>

        {started && (
          <SessionTimer
            durationMinutes={durationMinutes || 15}
            onTimeUp={endConversation}
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

      {/* Coaching Indicators */}
      {started && (
        <div className="bg-surface rounded-lg px-4 py-2">
          <CoachingIndicators transcript={transcript} agentStatus={agentStatus} />
        </div>
      )}

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
          onClick={endConversation}
          className="px-6 py-2 bg-error/20 text-error rounded-lg text-sm font-medium hover:bg-error/30 transition-colors"
        >
          End Session
        </button>
      </div>
    </div>
  )
}
