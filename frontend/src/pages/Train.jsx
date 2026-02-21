import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listPersonas, startSession, endSession } from '../api'
import VoiceSession from '../components/VoiceSession'

export default function Train() {
  const location = useLocation()
  const navigate = useNavigate()
  const [phase, setPhase] = useState('setup') // setup | connecting | active | ended
  const [personas, setPersonas] = useState([])
  const [personaId, setPersonaId] = useState(location.state?.personaId || null)
  const [demoContext, setDemoContext] = useState(location.state?.demoContext || '')
  const [duration, setDuration] = useState(location.state?.durationMinutes || 15)
  const [sessionData, setSessionData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    listPersonas().then(p => {
      setPersonas(p)
      if (!personaId && p.length) setPersonaId(p[0].id)
    })
  }, [])

  // Auto-start if navigated from dashboard with state
  useEffect(() => {
    if (location.state?.personaId && phase === 'setup') {
      handleStart()
    }
  }, [personas])

  const handleStart = async () => {
    if (!personaId) return
    setPhase('connecting')
    setError(null)
    try {
      const data = await startSession({
        persona_id: personaId,
        demo_context: demoContext,
        duration_minutes: duration,
      })
      setSessionData(data)
      setPhase('active')
    } catch (e) {
      setError(e.message)
      setPhase('setup')
    }
  }

  const handleEnd = useCallback(async (transcript) => {
    setPhase('ended')
    if (sessionData?.session_id) {
      try {
        await endSession(sessionData.session_id)
      } catch (e) {
        console.error('Failed to end session:', e)
      }
      navigate(`/sessions/${sessionData.session_id}`)
    }
  }, [sessionData, navigate])

  // Setup phase
  if (phase === 'setup' || phase === 'connecting') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Start Training</h1>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="bg-surface rounded-lg p-6 border border-border space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Select Persona</label>
            <div className="grid grid-cols-2 gap-3">
              {personas.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPersonaId(p.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    personaId === p.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: p.avatar_color }}
                    >
                      {p.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-text-secondary capitalize">{p.type}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Demo Context</label>
            <textarea
              value={demoContext}
              onChange={e => setDemoContext(e.target.value)}
              placeholder="What will you be presenting?"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-secondary/50 resize-none h-24 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Duration</label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              >
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
              </select>
            </div>
            <button
              onClick={handleStart}
              disabled={!personaId || phase === 'connecting'}
              className="px-8 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {phase === 'connecting' ? 'Connecting...' : 'Start Session'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active session
  if (phase === 'active' && sessionData) {
    return (
      <div className="h-[calc(100vh-3rem)]">
        <VoiceSession
          signedUrl={sessionData.signed_url}
          sessionId={sessionData.session_id}
          durationMinutes={sessionData.duration_minutes || duration}
          persona={sessionData.persona}
          onEnd={handleEnd}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-text-secondary">Ending session...</p>
    </div>
  )
}
