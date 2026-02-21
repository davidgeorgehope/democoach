const tagColors = {
  technical_depth: 'bg-accent/20 text-accent',
  competitive: 'bg-primary/20 text-primary',
  credibility: 'bg-purple-500/20 text-purple-400',
  commercial: 'bg-success/20 text-success',
  scope_creep: 'bg-warning/20 text-warning',
  recovery: 'bg-error/20 text-error',
  coaching: 'bg-teal-500/20 text-teal-400',
}

const labels = {
  technical_depth: 'Technical Depth',
  competitive: 'Competitive',
  credibility: 'Credibility',
  commercial: 'Commercial',
  scope_creep: 'Scope Creep',
  recovery: 'Recovery',
  coaching: 'Coaching',
}

export default function CategoryTag({ category }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${tagColors[category] || 'bg-border text-text-secondary'}`}>
      {labels[category] || category}
    </span>
  )
}
