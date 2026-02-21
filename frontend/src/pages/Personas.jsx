import { useState, useEffect, useRef } from 'react'
import { listPersonas, createPersona, updatePersona, deletePersona, previewVoice, exportPersona, importPersona } from '../api'
import PersonaCard from '../components/PersonaCard'

export default function Personas() {
  const [personas, setPersonas] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [previewAudio, setPreviewAudio] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const fileInputRef = useRef(null)

  const load = () => listPersonas().then(setPersonas)
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm({ name: '', description: '', type: 'custom', system_prompt: '', voice_id: '', voice_name: '', avatar_color: '#F46800', tags: '' })
    setEditing('new')
  }

  const openEdit = (p) => {
    setForm({ ...p, tags: p.tags || '' })
    setEditing(p)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing === 'new') {
        await createPersona(form)
      } else {
        await updatePersona(editing.id, form)
      }
      setEditing(null)
      load()
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setSaving(false)
  }

  const handleDelete = async (p) => {
    if (!confirm(`Delete persona "${p.name}"?`)) return
    await deletePersona(p.id)
    load()
  }

  const handlePreview = async (p) => {
    try {
      const blob = await previewVoice(p.id)
      const url = URL.createObjectURL(blob)
      if (previewAudio) { previewAudio.pause(); URL.revokeObjectURL(previewAudio.src) }
      const audio = new Audio(url)
      setPreviewAudio(audio)
      audio.play()
    } catch (e) {
      alert('Preview failed: ' + e.message)
    }
  }

  const handleExport = async (p) => {
    try {
      const data = await exportPersona(p.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `persona-${p.name.toLowerCase().replace(/\s+/g, '-')}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Export failed: ' + e.message)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await importPersona(data)
      load()
    } catch (err) {
      alert('Import failed: ' + err.message)
    }
    e.target.value = ''
  }

  // Filter personas
  const filtered = personas.filter(p => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.tags || '').toLowerCase().includes(q)
    const matchesType = !filterType || p.type === filterType
    return matchesSearch && matchesType
  })

  // Get unique types for filter
  const types = [...new Set(personas.map(p => p.type))]

  // Edit/Create form
  if (editing) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{editing === 'new' ? 'Create Persona' : 'Edit Persona'}</h1>
          <button onClick={() => setEditing(null)} className="text-sm text-text-secondary hover:text-text">
            Cancel
          </button>
        </div>
        <div className="bg-surface rounded-lg p-6 border border-border space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Name</label>
              <input
                value={form.name || ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Type</label>
              <select
                value={form.type || 'custom'}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text"
              >
                <option value="customer">Customer</option>
                <option value="panelist">Panelist</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Description</label>
            <input
              value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Tags (comma-separated)</label>
            <input
              value={form.tags || ''}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="e.g., enterprise, technical, cxo"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">System Prompt</label>
            <textarea
              value={form.system_prompt || ''}
              onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text font-mono resize-none h-48 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Voice ID</label>
              <input
                value={form.voice_id || ''}
                onChange={e => setForm(f => ({ ...f, voice_id: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Voice Name</label>
              <input
                value={form.voice_name || ''}
                onChange={e => setForm(f => ({ ...f, voice_name: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Avatar Color</label>
              <input
                type="color"
                value={form.avatar_color || '#F46800'}
                onChange={e => setForm(f => ({ ...f, avatar_color: e.target.value }))}
                className="w-full h-10 bg-bg border border-border rounded-lg cursor-pointer"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !form.name || !form.system_prompt || !form.voice_id}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Persona'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Personas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Create Persona
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search personas..."
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
        >
          <option value="">All Types</option>
          {types.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="relative">
            <PersonaCard
              persona={p}
              onEdit={openEdit}
              onDelete={handleDelete}
              onPreview={handlePreview}
            />
            <button
              onClick={() => handleExport(p)}
              className="absolute top-2 right-2 px-2 py-1 bg-bg/80 border border-border rounded text-xs text-text-secondary hover:text-text transition-colors"
              title="Export persona as JSON"
            >
              Export
            </button>
            {p.tags && (
              <div className="px-4 pb-3 flex flex-wrap gap-1 -mt-1">
                {p.tags.split(',').map((tag, i) => (
                  <span key={i} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-text-secondary text-sm text-center py-12">
          {searchQuery || filterType ? 'No personas match your search.' : 'No personas yet.'}
        </p>
      )}
    </div>
  )
}
