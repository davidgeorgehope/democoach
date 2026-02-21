import { useState, useEffect } from 'react'
import { listKBDocs, uploadKBDoc, deleteKBDoc } from '../api'
import FileUpload from '../components/FileUpload'

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)

  const load = () => listKBDocs().then(setDocs).catch(() => setDocs([]))
  useEffect(() => { load() }, [])

  const handleUpload = async (file) => {
    setUploading(true)
    try {
      await uploadKBDoc(file)
      load()
    } catch (e) {
      alert('Upload failed: ' + e.message)
    }
    setUploading(false)
  }

  const handleDelete = async (doc) => {
    if (!confirm('Remove this document from the knowledge base?')) return
    try {
      await deleteKBDoc(doc.id)
      load()
    } catch (e) {
      alert('Delete failed: ' + e.message)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Knowledge Base</h1>
      <p className="text-sm text-text-secondary">
        Upload documents to give the AI agent additional context during conversations.
        Supports PDF, TXT, MD, and DOCX files (max 20MB).
      </p>

      <FileUpload
        onUpload={handleUpload}
        accept=".pdf,.txt,.md,.docx"
        label={uploading ? 'Uploading...' : 'Drop a document or click to browse'}
      />

      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        {docs.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-12">No documents in knowledge base.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-surface-hover">
                <div>
                  <p className="text-sm font-medium">{doc.name}</p>
                </div>
                <button
                  onClick={() => handleDelete(doc)}
                  className="text-xs text-error/70 hover:text-error"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
