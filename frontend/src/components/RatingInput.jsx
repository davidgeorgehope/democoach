export default function RatingInput({ value, onChange, size = 'md' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`${sizes[size]} transition-colors cursor-pointer ${
            n <= (value || 0) ? 'text-warning' : 'text-border hover:text-warning/50'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
