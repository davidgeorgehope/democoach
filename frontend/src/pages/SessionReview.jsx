import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSession, updateSession, evaluateSession, getSessionReport } from '../api'
import RatingInput from '../components/RatingInput'

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

function scoreBadgeColor(score) {
  if (score >= 8) return 'text-success border-success'
  if (score >= 6) return 'text-primary border-primary'
  if (score >= 4) return 'text-warning border-warning'
  return 'text-error border-error'
}

export default function SessionReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [events, setEvents] = useState([])
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [report, setReport] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [evalError, setEvalError] = useState(null)

  useEffect(() => {
    getSession(id).then(data => {
      setSession(data.session)
      setEvents(data.events || [])
      setRating(data.session.overall_rating || 0)
      setNotes(data.session.notes || '')
      if (data.session.transcript_json) {
        try {
          const parsed = JSON.parse(data.session.transcript_json)
          if (parsed.transcript) setTranscript(parsed.transcript)
          else if (Array.isArray(parsed)) setTranscript(parsed)
        } catch (e) {}
      }
    })
    // Try to load existing report
    getSessionReport(id).then(data => {
      setReport(data.report)
    }).catch(() => {})
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    await updateSession(id, { overall_rating: rating, notes })
    setSaving(false)
  }

  const handleEvaluate = async () => {
    setEvaluating(true)
    setEvalError(null)
    try {
      const data = await evaluateSession(id)
      setReport(data.report)
    } catch (e) {
      setEvalError(e.message)
    }
    setEvaluating(false)
  }

  if (!session) {
    return <div className="text-text-secondary">Loading...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Session Review</h1>
        <button
          onClick={() => navigate('/sessions')}
          className="text-sm text-text-secondary hover:text-text"
        >
          Back to Sessions
        </button>
      </div>

      {/* Summary */}
      <div className="bg-surface rounded-lg p-4 border border-border">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-text-secondary">Persona</p>
            <p className="font-medium">{session.persona_name || '—'}</p>
          </div>
          <div>
            <p className="text-text-secondary">Duration</p>
            <p className="font-medium">
              {session.duration_seconds ? `${Math.round(session.duration_seconds / 60)} min` : '—'}
            </p>
          </div>
          <div>
            <p className="text-text-secondary">Status</p>
            <p className={`font-medium ${session.status === 'completed' ? 'text-success' : 'text-warning'}`}>
              {session.status}
            </p>
          </div>
          <div>
            <p className="text-text-secondary">Date</p>
            <p className="font-medium">{new Date(session.started_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* AI Coaching Report */}
      {report ? (
        <div className="space-y-4">
          {/* Overall Score */}
          <div className="bg-surface rounded-lg p-6 border border-border flex items-center gap-6">
            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${scoreBadgeColor(report.overall_score)}`}>
              <span className="text-3xl font-bold">{report.overall_score}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">AI Coaching Score</h2>
              <p className="text-sm text-text-secondary">Evaluated by {report.model_used}</p>
            </div>
          </div>

          {/* Category Scores */}
          <div className="bg-surface rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-3">Category Scores</h3>
            <div className="space-y-2">
              {Object.entries(SCORE_LABELS).map(([key, label]) => {
                const score = report.scores?.[key] || 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary w-36 shrink-0">{label}</span>
                    <div className="flex-1 h-3 bg-bg rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${scoreColor(score)}`}
                        style={{ width: `${score * 10}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{score}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-surface rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-2">Summary</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{report.summary}</p>
          </div>

          {/* Strengths */}
          {report.strengths?.length > 0 && (
            <div className="bg-surface rounded-lg p-4 border border-success/30">
              <h3 className="text-sm font-semibold mb-2 text-success">Strengths</h3>
              <div className="space-y-2">
                {report.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-success shrink-0 mt-0.5">+</span>
                    <span className="text-text-secondary">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {report.improvements?.length > 0 && (
            <div className="bg-surface rounded-lg p-4 border border-warning/30">
              <h3 className="text-sm font-semibold mb-2 text-warning">Areas to Improve</h3>
              <div className="space-y-2">
                {report.improvements.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-warning shrink-0 mt-0.5">!</span>
                    <span className="text-text-secondary">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Moments */}
          {report.moments?.length > 0 && (
            <div className="bg-surface rounded-lg p-4 border border-border">
              <h3 className="text-sm font-semibold mb-3">Key Moments</h3>
              <div className="space-y-4">
                {report.moments.map((m, i) => (
                  <div key={i} className="border-l-2 border-primary pl-3 space-y-1">
                    <p className="text-xs text-text-secondary">{m.timestamp}</p>
                    <p className="text-sm italic text-text">"{m.quote}"</p>
                    <p className="text-sm text-text-secondary">{m.analysis}</p>
                    <details className="text-sm">
                      <summary className="text-primary cursor-pointer text-xs">Suggested response</summary>
                      <p className="mt-1 text-text-secondary bg-bg rounded p-2 text-xs">{m.suggested_response}</p>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KB Accuracy Flags */}
          {report.kb_flags?.length > 0 && (
            <div className="bg-surface rounded-lg p-4 border border-error/30">
              <h3 className="text-sm font-semibold mb-2 text-error">Accuracy Flags</h3>
              <p className="text-xs text-text-secondary mb-3">Statements that may contradict product documentation</p>
              <div className="space-y-3">
                {report.kb_flags.map((f, i) => (
                  <div key={i} className="bg-bg rounded-lg p-3 space-y-1">
                    <p className="text-sm"><span className="text-error font-medium">Said:</span> "{f.quote}"</p>
                    <p className="text-sm"><span className="text-success font-medium">Docs say:</span> {f.contradiction}</p>
                    <p className="text-xs text-text-secondary">Source: {f.kb_source}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-lg p-6 border border-border text-center space-y-3">
          {evaluating ? (
            <>
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-text-secondary">Generating coaching report with Claude Opus... This may take 10-20 seconds.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-text-secondary">No coaching report yet for this session.</p>
              {evalError && (
                <p className="text-sm text-error">{evalError}</p>
              )}
              <button
                onClick={handleEvaluate}
                disabled={!session.transcript_json}
                className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                Generate Coaching Report
              </button>
              {!session.transcript_json && (
                <p className="text-xs text-text-secondary">Transcript required for evaluation</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Rating + Notes */}
      <div className="bg-surface rounded-lg p-4 border border-border space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-2">Self Rating</label>
          <RatingInput value={rating} onChange={setRating} />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What went well? What to improve?"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-secondary/50 resize-none h-24 focus:outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Marked Moments */}
      {events.length > 0 && (
        <div className="bg-surface rounded-lg p-4 border border-border">
          <h2 className="text-lg font-semibold mb-3">Marked Moments</h2>
          <div className="space-y-3">
            {events.map(ev => (
              <div key={ev.id} className="border-l-2 border-warning pl-3 py-1">
                <p className="text-xs text-text-secondary">
                  {Math.floor(ev.timestamp_seconds / 60)}:{String(ev.timestamp_seconds % 60).padStart(2, '0')}
                </p>
                {ev.agent_text && (
                  <p className="text-sm"><span className="text-primary font-medium">Agent:</span> {ev.agent_text}</p>
                )}
                {ev.user_text && (
                  <p className="text-sm"><span className="text-accent font-medium">You:</span> {ev.user_text}</p>
                )}
                {ev.notes && <p className="text-xs text-text-secondary mt-1">{ev.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      {session.demo_context && (
        <div className="bg-surface rounded-lg p-4 border border-border">
          <h2 className="text-lg font-semibold mb-2">Demo Context</h2>
          <p className="text-sm text-text-secondary">{session.demo_context}</p>
        </div>
      )}

      {transcript.length > 0 && (
        <div className="bg-surface rounded-lg p-4 border border-border">
          <h2 className="text-lg font-semibold mb-3">Transcript</h2>
          <div className="space-y-2">
            {transcript.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.role === 'agent' ? 'text-primary' : 'text-text'}`}>
                <span className="font-medium">{msg.role === 'agent' ? 'Agent' : 'You'}:</span>{' '}
                {msg.message || msg.text || ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
