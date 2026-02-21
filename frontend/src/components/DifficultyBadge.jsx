const colors = {
  1: 'bg-success/20 text-success',
  2: 'bg-success/15 text-success',
  3: 'bg-warning/20 text-warning',
  4: 'bg-primary/20 text-primary',
  5: 'bg-error/20 text-error',
}

export default function DifficultyBadge({ level }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[level] || colors[3]}`}>
      {'●'.repeat(level)}{'○'.repeat(5 - level)}
    </span>
  )
}
