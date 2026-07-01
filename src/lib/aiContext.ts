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
    const folder = activeEmail.folder ?? 'inbox'
    const isInvite = /invitation|invite|calendar|meeting/i.test(activeEmail.subject)
    const suggestions = [
      'Summarize this email',
      'Draft a reply',
      'Forward this email',
      'Find related notes',
      'Mark follow-up task',
      ...(isInvite ? ['Add to calendar', 'Check for scheduling conflicts'] : []),
      ...(folder === 'inbox' ? ['Suggest quick acknowledgement'] : []),
    ]
    return {
      label: `Email · ${activeEmail.subject.slice(0, 36)}`,
      placeholder: `Ask about this email from ${activeEmail.fromName}...`,
      suggestions,
      contextPrefix: `User is reading email from ${activeEmail.fromName} titled "${activeEmail.subject}". `,
    }
  }

  if (view === 'email') {
    return {
      label: 'Email',
      placeholder: 'Ask about your inbox, drafts, or folders...',
      suggestions: [
        'Summarize my inbox',
        'Find unread from this week',
        'Draft a new email',
        'Show emails needing reply',
        'Scan for calendar invites',
      ],
      contextPrefix: 'User is in the email view. ',
    }
  }

  if (view === 'vault' && activeNote) {
    return {
      label: `Vault · ${activeNote.title}`,
      placeholder: `Ask about ${activeNote.title}...`,
      suggestions: [
        'Format headings',
        'Bulletize lists',
        'Suggest wiki links',
        'Polish wording',
        'Find similar notes',
        'Suggest tags',
      ],
      contextPrefix: `User is editing note "${activeNote.title}". Content preview: ${activeNote.content.slice(0, 400)}. `,
    }
  }

  if (view === 'notes') {
    return {
      label: activeNote ? `Notes · ${activeNote.title}` : 'Notes',
      placeholder: 'Ask about your notes...',
      suggestions: activeNote
        ? [
            'Format headings',
            'Suggest wiki links',
            'Polish wording',
            'Extract action items',
            'Find related emails',
          ]
        : ['Summarize recent notes', 'Find orphaned notes', 'Suggest tags'],
      contextPrefix: activeNote
        ? `User is editing note "${activeNote.title}". Content preview: ${activeNote.content.slice(0, 400)}. `
        : 'User is browsing notes. ',
    }
  }

  if (view === 'calendar') {
    return {
      label: 'Calendar',
      placeholder: 'Ask about your schedule...',
      suggestions: [
        'What meetings do I have this week?',
        'Prep for my next meeting',
        'Any conflicts today?',
        'Find meetings without a room',
        'Draft invite for new meeting',
      ],
      contextPrefix: 'User is viewing the calendar. ',
    }
  }

  if (view === 'graph') {
    return {
      label: 'Knowledge Graph',
      placeholder: 'Ask about connections in your graph...',
      suggestions: ['Explain this cluster', 'Find orphaned notes', 'Suggest new links', 'Show email-note bridges'],
      contextPrefix: 'User is viewing the knowledge graph. ',
    }
  }

  if (view === 'dashboard') {
    const unread = emails.filter((e) => !e.read).length
    return {
      label: 'Dashboard',
      placeholder: 'Ask EtherMail AI anything...',
      suggestions: [
        'Summarize my inbox',
        'Scan for reminders',
        'What should I focus on today?',
        'Show open to-dos',
        'Prep for next meeting',
      ],
      contextPrefix: `User is on dashboard. ${unread} unread emails, ${notes.length} notes. `,
    }
  }

  if (view === 'settings') {
    return {
      label: 'Settings',
      placeholder: 'Ask how EtherMail features work...',
      suggestions: ['How does Vault AI work?', 'How do I link email to notes?', 'How do quick acknowledgements work?'],
      contextPrefix: 'User is in settings. ',
    }
  }

  return {
    label: 'EtherMail AI',
    placeholder: "Ask EtherMail AI... (e.g. 'Draft email about budget')",
    suggestions: ['Summarize Q3 Plan', 'Scan for reminders', 'Find similar notes', 'Draft a follow-up email'],
    contextPrefix: '',
  }
}
