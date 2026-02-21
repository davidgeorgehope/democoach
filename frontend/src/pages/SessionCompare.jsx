import { useState, useEffect } from 'react'
import { listSessions, getSessionReport } from '../api'

const SCORE_LABELS = {
  objection_handling: 'Objection Handling',
  technical_accuracy: 'Technical Accuracy',
  storytelling_flow: 'Storytelling & Flow',
  confidence_pace: 'Confidence & Pace',
  discovery_listening: 'Discovery & Listening',
  recovery: 'Recovery',
}

function scoreColor(score) {
  if (score >= 8) return 'bg-success'
  if (score >= 6) return 'bg-primary'
  if (score >= 4) return 'bg-warning'
  return 'bg-error'
}

function DeltaArrow({ left, right }) {
  if (left === right) return <span className="text-text-secondary text-xs">=</span>
  if (right > left) return <span className="text-success text-xs">+{right - left}</span>
  return <span className="text-error text-xs">{right - left}</span>
}

export default function SessionCompare() {
  const [sessions, setSessions] = useState([])
  const [leftId, setLeftId] = useState('')
  const [rightId, setRightId] = useState('')
  const [leftReport, setLeftReport] = useState(null)
  const [rightReport, setRightReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listSessions().then(all => {
      // We'll show all sessions, reports will be loaded on selection
      setSessions(all)
    })
  }, [])

  useEffect(() => {
    if (leftId) {
      setLoading(true)
      getSessionReport(leftId).then(d => setLeftReport(d.report)).catch(() => setLeftReport(null)).finally(() => setLoading(false))
    } else {
      setLeftReport(null)
    }
  }, [leftId])

  useEffect(() => {
    if (rightId) {
      setLoading(true)
      getSessionReport(rightId).then(d => setRightReport(d.report)).catch(() => setRightReport(null)).finally(() => setLoading(false))
    } else {
      setRightReport(null)
    }
  }, [rightId])

  const renderReport = (report) => {
    if (!report) return <p className="text-sm text-text-secondary text-center py-8">Select a session with a coaching report</p>
    return (
      <div className="space-y-3">
        {/* Score */}
        <div className="text-center">
          <span className="text-4xl font-bold">{report.overall_score}</span>
          <span className="text-sm text-text-secondary"> / 10</span>
        </div>

        {/* Categories */}
        <div className="space-y-1.5">
          {Object.entries(SCORE_LABELS).map(([key, label]) => {
            const score = report.scores?.[key] || 0
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-text-secondary w-24 shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${scoreColor(score)}`} style={{ width: `${score * 10}%` }} />
                </div>
                <span className="text-xs font-medium w-4">{score}</span>
              </div>
            )
          })}
        </div>

        {/* Strengths */}
        {report.strengths?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-success mb-1">Strengths</p>
            {report.strengths.map((s, i) => (
              <p key={i} className="text-xs text-text-secondary mb-1">+ {s}</p>
            ))}
          </div>
        )}

        {/* Improvements */}
        {report.improvements?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-warning mb-1">Improve</p>
            {report.improvements.map((s, i) => (
              <p key={i} className="text-xs text-text-secondary mb-1">! {s}</p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Compare Sessions</h1>

      {/* Session Selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Session A</label>
          <select
            value={leftId}
            onChange={e => setLeftId(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="">Select session...</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {new Date(s.started_at).toLocaleDateString()} — {s.persona_name || 'Unknown'} ({s.status})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Session B</label>
          <select
            value={rightId}
            onChange={e => setRightId(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="">Select session...</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {new Date(s.started_at).toLocaleDateString()} — {s.persona_name || 'Unknown'} ({s.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Delta */}
      {leftReport && rightReport && (
        <div className="bg-surface rounded-lg p-4 border border-border">
          <h3 className="text-sm font-semibold mb-3">Score Changes (A → B)</h3>
          <div className="grid grid-cols-7 gap-2 text-center">
            <div>
              <p className="text-xs text-text-secondary">Overall</p>
              <DeltaArrow left={leftReport.overall_score} right={rightReport.overall_score} />
            </div>
            {Object.entries(SCORE_LABELS).map(([key, label]) => (
              <div key={key}>
                <p className="text-xs text-text-secondary">{label.split(' ')[0]}</p>
                <DeltaArrow left={leftReport.scores?.[key] || 0} right={rightReport.scores?.[key] || 0} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side by Side Reports */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-border">
          <h3 className="text-sm font-semibold mb-3">Session A</h3>
          {renderReport(leftReport)}
        </div>
        <div className="bg-surface rounded-lg p-4 border border-border">
          <h3 className="text-sm font-semibold mb-3">Session B</h3>
          {renderReport(rightReport)}
        </div>
      </div>
    </div>
  )
}
