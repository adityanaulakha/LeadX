import { useState } from 'react'
import { toggleMute, getMuteState, playClickSound } from '../lib/sounds.js'
import { buttonClass } from '../ui/ui.jsx'

export default function SoundToggleButton({ className = '' }) {
  const [muted, setMuted] = useState(getMuteState())

  const handleToggle = (e) => {
    e.stopPropagation()
    const nextMuted = toggleMute()
    setMuted(nextMuted)
    if (!nextMuted) {
      setTimeout(() => {
        playClickSound()
      }, 50)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-pressed={muted}
      className={`${buttonClass(muted ? 'white' : 'yellow', 'sm', 'h-11 w-11 px-0')} ${className}`}
    >
      <span className="sr-only">{muted ? 'Unmute' : 'Mute'}</span>
      {muted ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      )}
    </button>
  )
}
