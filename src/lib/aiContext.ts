import type { Email, Note, View } from '../types'

export interface AIContext {
  label: string
  placeholder: string
  suggestions: string[]
  contextPrefix: string
}

export function getAIContext(
  view: View,
  opts: {
    activeEmail?: Email | null
    activeNote?: Note | null
    emails: Email[]
    notes: Note[]
  },
): AIContext {
  const { activeEmail, activeNote, emails, notes } = opts

  if (view === 'email' && activeEmail) {
    return {
      label: `Email · ${activeEmail.subject.slice(0, 40)}`,
      placeholder: `Ask about this email from ${activeEmail.fromName}...`,
      suggestions: ['Summarize this email', 'Draft a reply', 'Find related notes', 'Create a task'],
      contextPrefix: `User is reading email from ${activeEmail.fromName} titled "${activeEmail.subject}". `,
    }
  }

  if (view === 'vault' && activeNote) {
    return {
      label: `Vault · ${activeNote.title}`,
      placeholder: `Ask about ${activeNote.title}...`,
      suggestions: ['Refine wording', 'Find similar notes', 'Suggest tags', 'Expand this section'],
      contextPrefix: `User is editing note "${activeNote.title}". `,
    }
  }

  if (view === 'calendar') {
    return {
      label: 'Calendar',
      placeholder: 'Ask about your schedule...',
      suggestions: ['What meetings do I have this week?', 'Prep for my next meeting', 'Any conflicts today?'],
      contextPrefix: 'User is viewing the calendar. ',
    }
  }

  if (view === 'graph') {
    return {
      label: 'Knowledge Graph',
      placeholder: 'Ask about connections in your graph...',
      suggestions: ['Explain this cluster', 'Find orphaned notes', 'Suggest new links'],
      contextPrefix: 'User is viewing the knowledge graph. ',
    }
  }

  if (view === 'dashboard') {
    const unread = emails.filter((e) => !e.read).length
    return {
      label: 'Dashboard',
      placeholder: 'Ask EtherMail AI anything...',
      suggestions: ['Summarize my inbox', 'Scan for reminders', 'What should I focus on today?'],
      contextPrefix: `User is on dashboard. ${unread} unread emails, ${notes.length} notes. `,
    }
  }

  if (view === 'settings') {
    return {
      label: 'Settings',
      placeholder: 'Ask how EtherMail features work...',
      suggestions: ['How does Vault AI work?', 'How do I link email to notes?'],
      contextPrefix: 'User is in settings. ',
    }
  }

  return {
    label: 'EtherMail AI',
    placeholder: "Ask EtherMail AI... (e.g. 'Draft email about budget')",
    suggestions: ['Summarize Q3 Plan', 'Scan for reminders', 'Find similar notes'],
    contextPrefix: '',
  }
}
