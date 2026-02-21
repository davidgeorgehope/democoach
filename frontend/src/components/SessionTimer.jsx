import { useState, useEffect, useRef } from 'react'

export default function SessionTimer({ durationMinutes, onTimeUp }) {
  const totalSeconds = durationMinutes * 60
  const [remaining, setRemaining] = useState(totalSeconds)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          onTimeUp?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [totalSeconds, onTimeUp])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const pct = remaining / totalSeconds
  const urgent = remaining <= 120 // last 2 minutes

  return (
    <div className={`flex items-center gap-2 font-mono text-lg ${
      urgent ? 'text-error' : pct < 0.5 ? 'text-warning' : 'text-text'
    }`}>
      <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            urgent ? 'bg-error' : pct < 0.5 ? 'bg-warning' : 'bg-success'
          }`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className={urgent ? 'animate-pulse' : ''}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  )
}
