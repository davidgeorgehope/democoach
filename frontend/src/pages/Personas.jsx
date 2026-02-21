import { useState, useEffect } from 'react'
import { listPersonas, createPersona, updatePersona, deletePersona, previewVoice } from '../api'
import PersonaCard from '../components/PersonaCard'

export default function Personas() {
  const [personas, setPersonas] = useState([])
  const [editing, setEditing] = useState(null) // null = list, 'new' = create, persona = edit
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [previewAudio, setPreviewAudio] = useState(null)

  const load = () => listPersonas().then(setPersonas)
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm({ name: '', description: '', type: 'custom', system_prompt: '', voice_id: '', voice_name: '', avatar_color: '#F46800' })
    setEditing('new')
  }

  const openEdit = (p) => {
    setForm({ ...p })
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
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          Create Persona
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {personas.map(p => (
          <PersonaCard
            key={p.id}
            persona={p}
            onEdit={openEdit}
            onDelete={handleDelete}
            onPreview={handlePreview}
          />
        ))}
      </div>
      {personas.length === 0 && (
        <p className="text-text-secondary text-sm text-center py-12">No personas yet.</p>
      )}
    </div>
  )
}
