import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPersonas, listSessions, getSessionStats, getSessionProgress } from '../api'

function ScoreTrend({ data }) {
  if (!data || data.length < 2) return null
  const scores = data.slice(-10).map(d => d.overall_score)
  const max = 10
  const w = 280
  const h = 60
  const padding = 4
  const step = (w - padding * 2) / (scores.length - 1)

  const points = scores.map((s, i) => `${padding + i * step},${h - padding - ((s / max) * (h - padding * 2))}`)
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p}`).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
      <polyline fill="none" stroke="var(--color-primary, #F46800)" strokeWidth="2" points={points.join(' ')} />
      {scores.map((s, i) => {
        const [x, y] = points[i].split(',').map(Number)
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--color-primary, #F46800)" />
      })}
    </svg>
  )
}

function CategoryBars({ scores }) {
  if (!scores) return null
  const labels = {
    objection_handling: 'Objections',
    technical_accuracy: 'Technical',
    storytelling_flow: 'Storytelling',
    confidence_pace: 'Confidence',
    discovery_listening: 'Discovery',
    recovery: 'Recovery',
  }
  return (
    <div className="space-y-1.5">
      {Object.entries(labels).map(([key, label]) => {
        const score = scores[key] || 0
        const color = score >= 8 ? 'bg-success' : score >= 6 ? 'bg-primary' : score >= 4 ? 'bg-warning' : 'bg-error'
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-text-secondary w-20 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
            </div>
            <span className="text-xs font-medium w-4 text-right">{score}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [personas, setPersonas] = useState([])
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [progress, setProgress] = useState([])
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [demoContext, setDemoContext] = useState('')
  const [duration, setDuration] = useState(15)

  useEffect(() => {
    listPersonas().then(setPersonas)
    listSessions().then(s => setSessions(s.slice(0, 5)))
    getSessionStats().then(setStats)
    getSessionProgress().then(setProgress).catch(() => {})
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

  // Compute progress stats
  const avgAiScore = progress.length > 0
    ? (progress.reduce((a, p) => a + (p.overall_score || 0), 0) / progress.length).toFixed(1)
    : null
  const latestScores = progress.length > 0
    ? (() => { try { return JSON.parse(progress[progress.length - 1].scores_json) } catch { return null } })()
    : null

  // Find best/worst category from latest
  let bestCat = null, worstCat = null
  if (latestScores) {
    const entries = Object.entries(latestScores)
    if (entries.length) {
      bestCat = entries.reduce((a, b) => b[1] > a[1] ? b : a)
      worstCat = entries.reduce((a, b) => b[1] < a[1] ? b : a)
    }
  }
  const catLabels = {
    objection_handling: 'Objection Handling',
    technical_accuracy: 'Technical Accuracy',
    storytelling_flow: 'Storytelling & Flow',
    confidence_pace: 'Confidence & Pace',
    discovery_listening: 'Discovery & Listening',
    recovery: 'Recovery',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Quick Start */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Persona</label>
            <select
              value={selectedPersona?.id || ''}
              onChange={e => setSelectedPersona(personas.find(p => p.id === e.target.value))}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              {personas.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Demo Context (optional)</label>
            <textarea
              value={demoContext}
              onChange={e => setDemoContext(e.target.value)}
              placeholder="What will you be demoing? e.g., 'Cloud platform — key features and workflows'"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-secondary/50 resize-none h-20 focus:outline-none focus:border-primary"
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
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Sessions', value: stats.total_sessions || 0 },
            { label: 'Avg AI Score', value: avgAiScore ? `${avgAiScore} / 10` : '—' },
            { label: 'Avg Self Rating', value: stats.avg_rating ? stats.avg_rating.toFixed(1) + ' / 5' : '—' },
            { label: 'Avg Duration', value: stats.avg_duration ? Math.round(stats.avg_duration / 60) + ' min' : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface rounded-lg p-4 border border-border text-center">
              <p className="text-2xl font-bold text-text">{value}</p>
              <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress & Categories */}
      {progress.length >= 2 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Score Trend */}
          <div className="bg-surface rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-2">Score Trend (Last 10)</h3>
            <ScoreTrend data={progress} />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>{new Date(progress[Math.max(0, progress.length - 10)].date).toLocaleDateString()}</span>
              <span>{new Date(progress[progress.length - 1].date).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-surface rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-2">Latest Category Scores</h3>
            <CategoryBars scores={latestScores} />
            {bestCat && worstCat && (
              <div className="flex gap-4 mt-3 text-xs">
                <span className="text-success">Best: {catLabels[bestCat[0]] || bestCat[0]}</span>
                <span className="text-warning">Focus: {catLabels[worstCat[0]] || worstCat[0]}</span>
              </div>
            )}
          </div>
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
