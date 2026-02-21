import { useState, useEffect } from 'react'
import { listObjections, listPersonas, deleteObjection, generateObjections, bulkCreateObjections } from '../api'
import ObjectionTable from '../components/ObjectionTable'
import CategoryTag from '../components/CategoryTag'

const CATEGORIES = ['technical_depth', 'competitive', 'credibility', 'commercial', 'scope_creep', 'recovery', 'coaching']

export default function Objections() {
  const [objections, setObjections] = useState([])
  const [personas, setPersonas] = useState([])
  const [filters, setFilters] = useState({})
  const [showGenerate, setShowGenerate] = useState(false)
  const [genContext, setGenContext] = useState('')
  const [genType, setGenType] = useState('customer')
  const [genCount, setGenCount] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(null)

  const load = () => listObjections(filters).then(setObjections)

  useEffect(() => { load() }, [filters])
  useEffect(() => { listPersonas().then(setPersonas) }, [])

  const handleDelete = async (obj) => {
    if (!confirm('Delete this objection?')) return
    await deleteObjection(obj.id)
    load()
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await generateObjections({ demo_context: genContext, persona_type: genType, count: genCount })
      setGenerated(res.objections || [])
    } catch (e) {
      alert('Generation failed: ' + e.message)
    }
    setGenerating(false)
  }

  const handleAcceptGenerated = async () => {
    if (!generated?.length) return
    const persona = personas.find(p => p.type === genType)
    await bulkCreateObjections({
      objections: generated.map(o => ({
        persona_id: persona?.id || null,
        objection_text: o.objection_text,
        trigger_context: o.trigger_context,
        category: o.category,
        difficulty: o.difficulty || 3,
        source: 'generated',
      }))
    })
    setGenerated(null)
    setShowGenerate(false)
    load()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Objection Bank</h1>
        <button
          onClick={() => setShowGenerate(!showGenerate)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          Generate with AI
        </button>
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div className="bg-surface rounded-lg p-6 border border-primary/30 space-y-4">
          <h2 className="text-lg font-semibold">Generate Objections</h2>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Demo Context</label>
            <textarea
              value={genContext}
              onChange={e => setGenContext(e.target.value)}
              placeholder="Describe the demo scenario..."
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-secondary/50 resize-none h-20 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Persona Type</label>
              <select
                value={genType}
                onChange={e => setGenType(e.target.value)}
                className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text"
              >
                <option value="customer">Customer</option>
                <option value="panelist">Panelist</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Count</label>
              <select
                value={genCount}
                onChange={e => setGenCount(Number(e.target.value))}
                className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text"
              >
                {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={!genContext || generating}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Generated results */}
          {generated && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">{generated.length} objections generated</p>
                <button
                  onClick={handleAcceptGenerated}
                  className="px-4 py-1.5 bg-success/20 text-success rounded-lg text-sm font-medium hover:bg-success/30"
                >
                  Accept All
                </button>
              </div>
              {generated.map((o, i) => (
                <div key={i} className="bg-bg rounded-lg p-3 text-sm space-y-1">
                  <p className="text-text font-medium">"{o.objection_text}"</p>
                  <div className="flex gap-2 items-center">
                    <CategoryTag category={o.category} />
                    <span className="text-text-secondary text-xs">Difficulty: {o.difficulty}/5</span>
                  </div>
                  {o.reasoning && <p className="text-text-secondary text-xs">{o.reasoning}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <span className="text-sm text-text-secondary">Filter:</span>
        <select
          value={filters.persona_id || ''}
          onChange={e => setFilters(f => ({ ...f, persona_id: e.target.value || undefined }))}
          className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-text"
        >
          <option value="">All Personas</option>
          {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filters.category || ''}
          onChange={e => setFilters(f => ({ ...f, category: e.target.value || undefined }))}
          className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-text"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
        <select
          value={filters.difficulty || ''}
          onChange={e => setFilters(f => ({ ...f, difficulty: e.target.value || undefined }))}
          className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-text"
        >
          <option value="">All Difficulties</option>
          {[1,2,3,4,5].map(d => <option key={d} value={d}>Difficulty {d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg p-4 border border-border">
        <ObjectionTable objections={objections} onDelete={handleDelete} />
      </div>
    </div>
  )
}
