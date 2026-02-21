import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listSessions, getSessionStats } from '../api'

export default function Sessions() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    listSessions().then(setSessions)
    getSessionStats().then(setStats)
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Session History</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total_sessions || 0 },
            { label: 'Completed', value: stats.completed_sessions || 0 },
            { label: 'Avg Rating', value: stats.avg_rating ? stats.avg_rating.toFixed(1) : '—' },
            { label: 'Avg Duration', value: stats.avg_duration ? Math.round(stats.avg_duration / 60) + 'm' : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface rounded-lg p-3 border border-border text-center">
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-text-secondary">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Session list */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        {sessions.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-12">No sessions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary text-left">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Persona</th>
                <th className="p-3 font-medium">Duration</th>
                <th className="p-3 font-medium">Rating</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/sessions/${s.id}`)}
                  className="border-b border-border/50 hover:bg-surface-hover cursor-pointer"
                >
                  <td className="p-3">{new Date(s.started_at).toLocaleString()}</td>
                  <td className="p-3">{s.persona_name || '—'}</td>
                  <td className="p-3">{s.duration_seconds ? `${Math.round(s.duration_seconds / 60)}m` : '—'}</td>
                  <td className="p-3">
                    {s.overall_rating ? (
                      <span className="text-warning">{'★'.repeat(s.overall_rating)}{'☆'.repeat(5 - s.overall_rating)}</span>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      s.status === 'completed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
