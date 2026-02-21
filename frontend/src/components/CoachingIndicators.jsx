import { useState, useEffect, useRef } from 'react'

export default function CoachingIndicators({ transcript, agentStatus }) {
  const [userTalkTime, setUserTalkTime] = useState(0)
  const [agentTalkTime, setAgentTalkTime] = useState(0)
  const [consecutiveUserSeconds, setConsecutiveUserSeconds] = useState(0)
  const [silenceAfterQuestion, setSilenceAfterQuestion] = useState(0)
  const lastSpeakerRef = useRef(null)
  const timerRef = useRef(null)

  // Track talk time based on status changes
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      if (agentStatus === 'listening') {
        setUserTalkTime(prev => prev + 1)
        setConsecutiveUserSeconds(prev => prev + 1)
        setSilenceAfterQuestion(0)
      } else if (agentStatus === 'speaking') {
        setAgentTalkTime(prev => prev + 1)
        setConsecutiveUserSeconds(0)
        setSilenceAfterQuestion(0)
      } else if (agentStatus === 'connected') {
        // Silence — check if agent just asked a question
        if (lastSpeakerRef.current === 'agent') {
          setSilenceAfterQuestion(prev => prev + 1)
        }
        setConsecutiveUserSeconds(0)
      }
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [agentStatus])

  // Track last speaker from transcript
  useEffect(() => {
    if (transcript.length > 0) {
      const last = transcript[transcript.length - 1]
      lastSpeakerRef.current = last.speaker
      if (last.speaker === 'agent') {
        setSilenceAfterQuestion(0)
      }
    }
  }, [transcript.length])

  const totalTime = userTalkTime + agentTalkTime || 1
  const userPercent = Math.round((userTalkTime / totalTime) * 100)
  const showMonologueWarning = consecutiveUserSeconds > 60
  const showSilenceHint = silenceAfterQuestion > 5

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Talk ratio bar */}
      <div className="flex items-center gap-1.5 min-w-[120px]" title={`You: ${userPercent}% | Agent: ${100 - userPercent}%`}>
        <span className="text-text-secondary shrink-0">You</span>
        <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden flex">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${userPercent}%` }}
          />
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${100 - userPercent}%` }}
          />
        </div>
        <span className="text-text-secondary shrink-0">AI</span>
      </div>

      {/* Monologue warning */}
      {showMonologueWarning && (
        <span className="px-2 py-0.5 bg-warning/20 text-warning rounded animate-pulse">
          Pause for questions
        </span>
      )}

      {/* Silence after question hint */}
      {showSilenceHint && (
        <span className="px-2 py-0.5 bg-primary/20 text-primary rounded animate-pulse">
          Take a breath, then respond
        </span>
      )}
    </div>
  )
}
