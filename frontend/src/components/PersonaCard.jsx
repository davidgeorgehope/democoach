export default function PersonaCard({ persona, onEdit, onDelete, onPreview, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect?.(persona)}
      className={`bg-surface rounded-lg p-4 border transition-colors cursor-pointer ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-text-secondary'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: persona.avatar_color || '#F46800' }}
          >
            {persona.name[0]}
          </div>
          <div>
            <h3 className="font-medium text-text">{persona.name}</h3>
            <span className="text-xs text-text-secondary capitalize">{persona.type}</span>
          </div>
        </div>
        {persona.is_default ? (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>
        ) : null}
      </div>
      <p className="text-sm text-text-secondary mb-3 line-clamp-2">{persona.description}</p>
      <div className="flex items-center gap-2 text-xs">
        {persona.voice_name && (
          <span className="text-text-secondary">Voice: {persona.voice_name}</span>
        )}
        <div className="flex-1" />
        {onPreview && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(persona) }}
            className="text-accent hover:text-accent/80"
          >
            Preview
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(persona) }}
            className="text-text-secondary hover:text-text"
          >
            Edit
          </button>
        )}
        {onDelete && !persona.is_default && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(persona) }}
            className="text-error/70 hover:text-error"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
