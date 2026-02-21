import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listPersonas, startSession, endSession, getModels, researchPersona, getOpenAIRealtimeToken } from '../api'
import VoiceSession from '../components/VoiceSession'
import OpenAIVoiceSession from '../components/OpenAIVoiceSession'

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
  const [audioDevices, setAudioDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')

  // Provider and model selection
  const [providers, setProviders] = useState([])
  const [selectedProvider, setSelectedProvider] = useState('elevenlabs')
  const [llmModels, setLlmModels] = useState([])
  const [ttsModels, setTtsModels] = useState([])
  const [selectedLlm, setSelectedLlm] = useState('')
  const [selectedTts, setSelectedTts] = useState('')

  // Research (auto-triggered when persona is selected)
  const [researchResults, setResearchResults] = useState(null)
  const [researchLoading, setResearchLoading] = useState(false)
  const [researchIds, setResearchIds] = useState([])

  // Load available models
  useEffect(() => {
    getModels().then(data => {
      setProviders(data.providers || [])
      setLlmModels(data.llm_models || [])
      setTtsModels(data.tts_models || [])
      setSelectedProvider(data.defaults?.provider || 'elevenlabs')
      setSelectedLlm(data.defaults?.llm || '')
      setSelectedTts(data.defaults?.tts || '')
    }).catch(e => console.error('Failed to load models:', e))
  }, [])

  // Load available microphones
  useEffect(() => {
    async function loadDevices() {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        const mics = devices.filter(d => d.kind === 'audioinput')
        setAudioDevices(mics)
        // Select the "default" mic if available, otherwise first one
        if (mics.length > 0 && !selectedDeviceId) {
          const defaultMic = mics.find(d =>
            d.deviceId === 'default' ||
            d.label.toLowerCase().includes('default')
          )
          setSelectedDeviceId(defaultMic?.deviceId || mics[0].deviceId)
        }
      } catch (e) {
        console.error('Could not enumerate audio devices:', e)
      }
    }
    loadDevices()
  }, [])

  useEffect(() => {
    listPersonas().then(p => {
      setPersonas(p)
      if (!personaId && p.length) setPersonaId(p[0].id)
    })
  }, [])

  // Auto-research when persona changes
  useEffect(() => {
    if (!personaId) return
    const persona = personas.find(p => p.id == personaId)
    if (!persona || (!persona.company_name && !persona.product_name)) {
      setResearchResults(null)
      setResearchIds([])
      return
    }
    setResearchLoading(true)
    setResearchResults(null)
    setResearchIds([])
    researchPersona(personaId)
      .then(res => {
        setResearchResults(res)
        setResearchIds(res.research_ids || [])
      })
      .catch(e => console.error('Auto-research failed:', e))
      .finally(() => setResearchLoading(false))
  }, [personaId, personas])

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

    const persona = personas.find(p => p.id === personaId)

    try {
      if (selectedProvider === 'openai-realtime') {
        // OpenAI Realtime - get ephemeral token
        const tokenData = await getOpenAIRealtimeToken()

        // Build system prompt for the persona - be very explicit about the role
        const rolePrompt = persona.type === 'customer'
          ? `IMPORTANT: You are ROLEPLAYING as ${persona.name}, a skeptical potential customer evaluating a software demo. ${persona.description}.

YOUR ROLE: You are the CUSTOMER being pitched to. The human user is a Sales Engineer giving YOU a demo.

BEHAVIOR:
- Act skeptical and ask tough questions
- Raise objections about pricing, competitors, complexity
- Never break character - you are NOT an AI assistant
- Never offer to help - YOU are the one being sold to
- Speak naturally like a busy executive would

Start by introducing yourself as ${persona.name} and ask what they're going to show you today.`
          : `IMPORTANT: You are ROLEPLAYING as ${persona.name}, a senior interviewer on a panel evaluating a Sales Engineer candidate. ${persona.description}.

YOUR ROLE: You are the INTERVIEWER. The human user is the CANDIDATE being interviewed.

BEHAVIOR:
- Ask challenging technical and situational questions
- Probe for depth of knowledge
- Never break character - you are NOT an AI assistant
- You are evaluating THEM, not helping them

Start by introducing yourself as ${persona.name} and ask them to begin their demo.`

        setSessionData({
          provider: 'openai-realtime',
          token: tokenData.token,
          persona,
          systemPrompt: rolePrompt,
          duration_minutes: duration,
          session_id: Date.now(), // temporary ID for marking moments
        })
      } else {
        // ElevenLabs - use existing flow
        const data = await startSession({
          persona_id: personaId,
          demo_context: demoContext,
          duration_minutes: duration,
          llm_model: selectedLlm || undefined,
          tts_model: selectedTts || undefined,
          research_ids: researchIds.length > 0 ? researchIds : undefined,
        })
        setSessionData({ ...data, provider: 'elevenlabs' })
      }
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
            <label className="block text-sm text-text-secondary mb-1">Select Persona</label>
            <select
              value={personaId || ''}
              onChange={e => setPersonaId(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              {personas.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
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

          {/* Auto Research (driven by persona) */}
          {(researchLoading || researchResults) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary uppercase flex items-center gap-2">
                Research & Intel
                {researchLoading && <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              </p>
              {researchLoading && (
                <p className="text-xs text-text-secondary">Researching persona background...</p>
              )}
              {researchResults && (
                <div className="bg-bg rounded-lg p-4 border border-border space-y-3 max-h-64 overflow-y-auto">
                  {/* Show errors */}
                  {researchResults.company?.error && (
                    <p className="text-xs text-warning">{researchResults.company.error}</p>
                  )}
                  {researchResults.competitive?.error && !researchResults.company?.error && (
                    <p className="text-xs text-warning">{researchResults.competitive.error}</p>
                  )}
                  {researchResults.company && !researchResults.company.error && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-primary">Company Intel</p>
                      <div className="text-xs text-text whitespace-pre-wrap">{researchResults.company.content}</div>
                      {researchResults.company.sources?.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-border">
                          {researchResults.company.sources.map((s, i) => (
                            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline truncate">{s.title || s.url}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {researchResults.competitive && !researchResults.competitive.error && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-primary">Competitive Intel</p>
                      <div className="text-xs text-text whitespace-pre-wrap">{researchResults.competitive.content}</div>
                      {researchResults.competitive.sources?.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-border">
                          {researchResults.competitive.sources.map((s, i) => (
                            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline truncate">{s.title || s.url}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Provider & Model Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Voice Provider</label>
              <select
                value={selectedProvider}
                onChange={e => setSelectedProvider(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              >
                {providers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedProvider === 'elevenlabs' && (
              <div>
                <label className="block text-sm text-text-secondary mb-1">LLM (Brain)</label>
                <select
                  value={selectedLlm}
                  onChange={e => setSelectedLlm(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                >
                  {llmModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.provider})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedProvider === 'openai-realtime' && (
              <div className="flex items-end">
                <p className="text-sm text-text-secondary">Uses GPT-4o Realtime natively</p>
              </div>
            )}
          </div>

          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Microphone</label>
              <select
                value={selectedDeviceId}
                onChange={e => setSelectedDeviceId(e.target.value)}
                className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary min-w-[200px]"
              >
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
                {audioDevices.length === 0 && (
                  <option value="">No microphones found</option>
                )}
              </select>
            </div>
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
        {sessionData.provider === 'openai-realtime' ? (
          <OpenAIVoiceSession
            token={sessionData.token}
            sessionId={sessionData.session_id}
            durationMinutes={sessionData.duration_minutes || duration}
            persona={sessionData.persona}
            systemPrompt={sessionData.systemPrompt}
            onEnd={handleEnd}
            selectedDeviceId={selectedDeviceId}
          />
        ) : (
          <VoiceSession
            signedUrl={sessionData.signed_url}
            sessionId={sessionData.session_id}
            durationMinutes={sessionData.duration_minutes || duration}
            persona={sessionData.persona}
            onEnd={handleEnd}
            selectedDeviceId={selectedDeviceId}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-text-secondary">Ending session...</p>
    </div>
  )
}
