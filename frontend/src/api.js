const BASE = '/api'

async function request(path, options = {}) {
  const url = `${BASE}${path}`
  const config = { ...options }

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.headers = { 'Content-Type': 'application/json', ...config.headers }
    config.body = JSON.stringify(config.body)
  }

  const res = await fetch(url, config)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }

  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return res.json()
  }
  return res
}

// Agent
export const getAgentStatus = () => request('/agent/status')
export const getAgentToken = () => request('/agent/token', { method: 'POST' })
export const getModels = () => request('/agent/models')
export const getOpenAIRealtimeToken = () => request('/agent/openai-token', { method: 'POST' })

// Personas
export const listPersonas = () => request('/personas')
export const createPersona = (data) => request('/personas', { method: 'POST', body: data })
export const updatePersona = (id, data) => request(`/personas/${id}`, { method: 'PATCH', body: data })
export const deletePersona = (id) => request(`/personas/${id}`, { method: 'DELETE' })
export const previewVoice = (id) =>
  fetch(`${BASE}/personas/${id}/preview`, { method: 'POST' }).then(r => r.blob())
export const exportPersona = (id) => request(`/personas/export/${id}`)
export const importPersona = (data) => request('/personas/import', { method: 'POST', body: data })

// Objections
export const listObjections = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null)).toString()
  return request(`/objections${qs ? '?' + qs : ''}`)
}
export const createObjection = (data) => request('/objections', { method: 'POST', body: data })
export const bulkCreateObjections = (data) => request('/objections/bulk', { method: 'POST', body: data })
export const generateObjections = (data) => request('/objections/generate', { method: 'POST', body: data })
export const updateObjection = (id, data) => request(`/objections/${id}`, { method: 'PATCH', body: data })
export const deleteObjection = (id) => request(`/objections/${id}`, { method: 'DELETE' })

// Sessions
export const startSession = (data) => request('/sessions/start', { method: 'POST', body: data })
export const endSession = (id, conversationId) =>
  request(`/sessions/${id}/end${conversationId ? '?conversation_id=' + conversationId : ''}`, { method: 'POST' })
export const markMoment = (id, data) => request(`/sessions/${id}/mark`, { method: 'POST', body: data })
export const updateSession = (id, data) => request(`/sessions/${id}`, { method: 'PATCH', body: data })
export const listSessions = () => request('/sessions')
export const getSession = (id) => request(`/sessions/${id}`)
export const getSessionStats = () => request('/sessions/stats')

// Transcripts
export const listTranscripts = () => request('/transcripts')
export const uploadTranscript = (file) => {
  const form = new FormData()
  form.append('file', file)
  return request('/transcripts/upload', { method: 'POST', body: form })
}
export const extractObjections = (id) => request(`/transcripts/${id}/extract`, { method: 'POST' })
export const deleteTranscript = (id) => request(`/transcripts/${id}`, { method: 'DELETE' })

// Research
export const researchPersona = (personaId) => request(`/research/persona/${personaId}`, { method: 'POST' })
export const researchCompany = (data) => request('/research/company', { method: 'POST', body: data })
export const researchCompetitive = (data) => request('/research/competitive', { method: 'POST', body: data })

// Coaching Reports
export const evaluateSession = (id) => request(`/sessions/${id}/evaluate`, { method: 'POST' })
export const getSessionReport = (id) => request(`/sessions/${id}/report`)
export const getSessionProgress = () => request('/sessions/progress')

// Knowledge Base
export const listKBDocs = () => request('/kb')
export const uploadKBDoc = (file) => {
  const form = new FormData()
  form.append('file', file)
  return request('/kb/upload', { method: 'POST', body: form })
}
export const deleteKBDoc = (id) => request(`/kb/${id}`, { method: 'DELETE' })
