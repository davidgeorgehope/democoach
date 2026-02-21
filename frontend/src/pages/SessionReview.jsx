import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSession, updateSession } from '../api'
import RatingInput from '../components/RatingInput'

export default function SessionReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [events, setEvents] = useState([])
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [transcript, setTranscript] = useState([])

  useEffect(() => {
    getSession(id).then(data => {
      setSession(data.session)
      setEvents(data.events || [])
      setRating(data.session.overall_rating || 0)
      setNotes(data.session.notes || '')
      // Parse transcript JSON if available
      if (data.session.transcript_json) {
        try {
          const parsed = JSON.parse(data.session.transcript_json)
          if (parsed.transcript) setTranscript(parsed.transcript)
          else if (Array.isArray(parsed)) setTranscript(parsed)
        } catch (e) {}
      }
    })
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    await updateSession(id, { overall_rating: rating, notes })
    setSaving(false)
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

      {/* Rating + Notes */}
      <div className="bg-surface rounded-lg p-4 border border-border space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-2">How did it go?</label>
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
