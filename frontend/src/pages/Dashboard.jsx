import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPersonas, listSessions, getSessionStats } from '../api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [personas, setPersonas] = useState([])
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [demoContext, setDemoContext] = useState('')
  const [duration, setDuration] = useState(15)

  useEffect(() => {
    listPersonas().then(setPersonas)
    listSessions().then(s => setSessions(s.slice(0, 5)))
    getSessionStats().then(setStats)
  }, [])

  useEffect(() => {
    if (personas.length && !selectedPersona) {
      setSelectedPersona(personas[0])
    }
  }, [personas])

  const handleQuickStart = () => {
    if (!selectedPersona) return
    navigate('/train', {
      state: { personaId: selectedPersona.id, demoContext, durationMinutes: duration }
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Quick Start */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
        <div className="space-y-4">
          {/* Persona select */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Persona</label>
            <div className="flex gap-2 flex-wrap">
              {personas.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    selectedPersona?.id === p.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-secondary hover:border-text-secondary'
                  }`}
                >
                  {p.name} ({p.type})
                </button>
              ))}
            </div>
          </div>

          {/* Demo context */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Demo Context (optional)</label>
            <textarea
              value={demoContext}
              onChange={e => setDemoContext(e.target.value)}
              placeholder="What will you be demoing? e.g., 'Grafana Cloud observability platform — logs, metrics, traces'"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-secondary/50 resize-none h-20 focus:outline-none focus:border-primary"
            />
          </div>

          {/* Duration + Go */}
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
              onClick={handleQuickStart}
              disabled={!selectedPersona}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              Start Training
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Sessions', value: stats.total_sessions || 0 },
            { label: 'Avg Rating', value: stats.avg_rating ? stats.avg_rating.toFixed(1) + ' / 5' : '—' },
            { label: 'Avg Duration', value: stats.avg_duration ? Math.round(stats.avg_duration / 60) + ' min' : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface rounded-lg p-4 border border-border text-center">
              <p className="text-2xl font-bold text-text">{value}</p>
              <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Sessions */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-text-secondary text-sm">No sessions yet. Start your first training above!</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => navigate(`/sessions/${s.id}`)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
              >
                <div>
                  <span className="text-sm font-medium">{s.persona_name || 'Unknown'}</span>
                  <span className="text-xs text-text-secondary ml-2">
                    {new Date(s.started_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {s.duration_seconds && (
                    <span className="text-text-secondary">{Math.round(s.duration_seconds / 60)}m</span>
                  )}
                  {s.overall_rating && (
                    <span className="text-warning">{'★'.repeat(s.overall_rating)}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    s.status === 'completed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                  }`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
