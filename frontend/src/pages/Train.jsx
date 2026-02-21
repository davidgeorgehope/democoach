import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listPersonas, startSession, endSession, getModels, researchCompany, researchCompetitive, getOpenAIRealtimeToken } from '../api'
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

  // Research
  const [showResearch, setShowResearch] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [productName, setProductName] = useState('')
  const [competitors, setCompetitors] = useState('')
  const [companyResults, setCompanyResults] = useState(null)
  const [competitiveResults, setCompetitiveResults] = useState(null)
  const [researchLoading, setResearchLoading] = useState(null) // 'company' | 'competitive' | null
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

          {/* Research Section */}
          <div>
            <button
              type="button"
              onClick={() => setShowResearch(!showResearch)}
              className="text-sm text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
            >
              {showResearch ? '▾' : '▸'} Research & Intel
            </button>
            {showResearch && (
              <div className="mt-3 space-y-3 bg-bg rounded-lg p-4 border border-border">
                {/* Company Research */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-text-secondary uppercase">Company Research</p>
                  <div className="flex gap-2">
                    <input
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="Company name"
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                    <input
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                      placeholder="Industry (optional)"
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={async () => {
                        if (!companyName) return
                        setResearchLoading('company')
                        try {
                          const res = await researchCompany({ company_name: companyName, industry })
                          setCompanyResults(res)
                          setResearchIds(prev => [...prev, res.id])
                        } catch (e) { setError(e.message) }
                        setResearchLoading(null)
                      }}
                      disabled={!companyName || researchLoading}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {researchLoading === 'company' ? 'Searching...' : 'Research'}
                    </button>
                  </div>
                  {companyResults && (
                    <div className="text-xs text-text bg-surface rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {companyResults.content}
                      {companyResults.sources?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-text-secondary font-medium">Sources:</p>
                          {companyResults.sources.map((s, i) => (
                            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline truncate">{s.title || s.url}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Competitive Intel */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-text-secondary uppercase">Competitive Intel</p>
                  <div className="flex gap-2">
                    <input
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      placeholder="Your product name"
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                    <input
                      value={competitors}
                      onChange={e => setCompetitors(e.target.value)}
                      placeholder="Competitors (optional)"
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={async () => {
                        if (!productName) return
                        setResearchLoading('competitive')
                        try {
                          const res = await researchCompetitive({ product_name: productName, competitors })
                          setCompetitiveResults(res)
                          setResearchIds(prev => [...prev, res.id])
                        } catch (e) { setError(e.message) }
                        setResearchLoading(null)
                      }}
                      disabled={!productName || researchLoading}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {researchLoading === 'competitive' ? 'Searching...' : 'Research'}
                    </button>
                  </div>
                  {competitiveResults && (
                    <div className="text-xs text-text bg-surface rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {competitiveResults.content}
                      {competitiveResults.sources?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-text-secondary font-medium">Sources:</p>
                          {competitiveResults.sources.map((s, i) => (
                            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline truncate">{s.title || s.url}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
