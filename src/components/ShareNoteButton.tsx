import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import type { Note } from '../types'
import { shareNote, shareResultMessage } from '../lib/shareNote'

interface Props {
  note: Pick<Note, 'title' | 'content'>
  className?: string
}

export function ShareNoteButton({ note, className = '' }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleShare = async () => {
    setLoading(true)
    const result = await shareNote(note)
    const msg = shareResultMessage(result)
    setLoading(false)
    if (msg) {
      setFeedback(msg)
      setTimeout(() => setFeedback(null), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      title="Share note"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme disabled:opacity-50 ${className}`}
    >
      {feedback ? (
        <>
          <Check size={14} className="text-emerald-400" />
          <span className="text-emerald-400">{feedback}</span>
        </>
      ) : (
        <>
          <Share2 size={14} />
          <span className="hidden sm:inline">Share</span>
        </>
      )}
    </button>
  )
}
