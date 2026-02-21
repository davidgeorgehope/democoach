import DifficultyBadge from './DifficultyBadge'
import CategoryTag from './CategoryTag'

export default function ObjectionTable({ objections, onEdit, onDelete }) {
  if (objections.length === 0) {
    return (
      <div className="text-center text-text-secondary py-12 text-sm">
        No objections found. Create some or generate with AI.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-text-secondary text-left">
            <th className="pb-3 font-medium">Objection</th>
            <th className="pb-3 font-medium w-32">Category</th>
            <th className="pb-3 font-medium w-28">Difficulty</th>
            <th className="pb-3 font-medium w-40">Trigger</th>
            <th className="pb-3 font-medium w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {objections.map(obj => (
            <tr key={obj.id} className="border-b border-border/50 hover:bg-surface-hover">
              <td className="py-3 pr-4">
                <p className="text-text">{obj.objection_text}</p>
              </td>
              <td className="py-3">
                <CategoryTag category={obj.category} />
              </td>
              <td className="py-3">
                <DifficultyBadge level={obj.difficulty} />
              </td>
              <td className="py-3 text-text-secondary text-xs">
                {obj.trigger_context}
              </td>
              <td className="py-3">
                <div className="flex gap-2 text-xs">
                  {onEdit && (
                    <button onClick={() => onEdit(obj)} className="text-accent hover:text-accent/80">
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(obj)} className="text-error/70 hover:text-error">
                      Del
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
