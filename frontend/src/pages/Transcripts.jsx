import { useState, useEffect } from 'react'
import { listTranscripts, uploadTranscript, extractObjections, deleteTranscript, bulkCreateObjections, listPersonas } from '../api'
import FileUpload from '../components/FileUpload'
import CategoryTag from '../components/CategoryTag'

export default function Transcripts() {
  const [transcripts, setTranscripts] = useState([])
  const [personas, setPersonas] = useState([])
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(null)
  const [extracted, setExtracted] = useState(null) // { transcriptId, objections }

  const load = () => listTranscripts().then(setTranscripts)
  useEffect(() => { load(); listPersonas().then(setPersonas) }, [])

  const handleUpload = async (file) => {
    setUploading(true)
    try {
      await uploadTranscript(file)
      load()
    } catch (e) {
      alert('Upload failed: ' + e.message)
    }
    setUploading(false)
  }

  const handleExtract = async (t) => {
    setExtracting(t.id)
    try {
      const res = await extractObjections(t.id)
      setExtracted({ transcriptId: t.id, objections: res.objections || [] })
    } catch (e) {
      alert('Extraction failed: ' + e.message)
    }
    setExtracting(null)
  }

  const handleAcceptExtracted = async () => {
    if (!extracted?.objections.length) return
    await bulkCreateObjections({
      objections: extracted.objections.map(o => ({
        objection_text: o.objection_text,
        trigger_context: o.trigger_context,
        category: o.category,
        difficulty: o.difficulty || 3,
        source: 'transcript_extraction',
      }))
    })
    setExtracted(null)
    load()
  }

  const handleDelete = async (t) => {
    if (!confirm('Delete this transcript?')) return
    await deleteTranscript(t.id)
    load()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Transcript Import</h1>

      <FileUpload
        onUpload={handleUpload}
        accept=".txt,.md,.vtt,.srt"
        label={uploading ? 'Uploading...' : 'Drop a transcript file (.txt, .md, .vtt, .srt) or click to browse'}
      />

      {/* Extracted Objections Review */}
      {extracted && (
        <div className="bg-surface rounded-lg p-6 border border-primary/30 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Extracted Objections ({extracted.objections.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setExtracted(null)}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-text"
              >
                Discard
              </button>
              <button
                onClick={handleAcceptExtracted}
                className="px-4 py-1.5 bg-success/20 text-success rounded-lg text-sm font-medium hover:bg-success/30"
              >
                Accept All
              </button>
            </div>
          </div>
          {extracted.objections.map((o, i) => (
            <div key={i} className="bg-bg rounded-lg p-3 text-sm space-y-1">
              <p className="text-text font-medium">"{o.objection_text}"</p>
              <div className="flex gap-2 items-center">
                <CategoryTag category={o.category} />
                <span className="text-text-secondary text-xs">Difficulty: {o.difficulty}/5</span>
              </div>
              {o.trigger_context && (
                <p className="text-text-secondary text-xs">Trigger: {o.trigger_context}</p>
              )}
              {o.reasoning && (
                <p className="text-text-secondary text-xs italic">{o.reasoning}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Transcript list */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        {transcripts.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-12">No transcripts imported yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary text-left">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium w-32">Imported</th>
                <th className="p-3 font-medium w-28">Extracted</th>
                <th className="p-3 font-medium w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transcripts.map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-surface-hover">
                  <td className="p-3">{t.name}</td>
                  <td className="p-3 text-text-secondary text-xs">{new Date(t.imported_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      t.objections_extracted ? 'bg-success/20 text-success' : 'bg-border text-text-secondary'
                    }`}>
                      {t.objections_extracted ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => handleExtract(t)}
                      disabled={extracting === t.id}
                      className="text-xs text-accent hover:text-accent/80 disabled:opacity-50"
                    >
                      {extracting === t.id ? 'Extracting...' : 'Extract Objections'}
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="text-xs text-error/70 hover:text-error"
                    >
                      Delete
                    </button>
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
