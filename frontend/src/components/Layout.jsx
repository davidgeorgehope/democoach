import { NavLink } from 'react-router-dom'

const nav = [
  { to: '/', label: 'Dashboard', icon: '⌂' },
  { to: '/train', label: 'Train', icon: '▶' },
  { to: '/sessions', label: 'Sessions', icon: '☰' },
  { to: '/objections', label: 'Objections', icon: '⚡' },
  { to: '/personas', label: 'Personas', icon: '◉' },
  { to: '/transcripts', label: 'Transcripts', icon: '⎙' },
  { to: '/kb', label: 'Knowledge Base', icon: '⊞' },
]

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-surface border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-primary">Reframe</h1>
          <p className="text-xs text-text-secondary">Objection Trainer</p>
        </div>
        <nav className="flex-1 py-2">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-text-secondary hover:text-text hover:bg-surface-hover'
                }`
              }
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
