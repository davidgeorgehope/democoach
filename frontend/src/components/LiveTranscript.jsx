import { useEffect, useRef } from 'react'

export default function LiveTranscript({ messages, persona }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary text-sm">
        Conversation will appear here...
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto space-y-3 pr-2">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex gap-3 ${msg.speaker === 'user' ? 'flex-row-reverse' : ''}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            msg.speaker === 'agent'
              ? 'bg-primary/20 text-primary'
              : 'bg-accent/20 text-accent'
          }`}>
            {msg.speaker === 'agent' ? (persona?.name?.[0] || 'A') : 'Y'}
          </div>
          <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
            msg.speaker === 'agent'
              ? 'bg-surface text-text'
              : 'bg-accent/10 text-text'
          }`}>
            {msg.text}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}
