import type { Email, Note } from '../types'
import { generateVaultAIResponse } from './rag'

export const TEMPLATES_FOLDER_ID = 'templates'

export interface EmailTemplate {
  id: string
  title: string
  subject: string
  body: string
}

/** Parse template notes — subject line in first heading or `Subject:` line */
export function getEmailTemplates(notes: Note[]): EmailTemplate[] {
  return notes
    .filter((n) => n.folderId === TEMPLATES_FOLDER_ID)
    .map((note) => {
      const subjectMatch = note.content.match(/^#\s+(.+)$/m) ?? note.content.match(/^Subject:\s*(.+)$/im)
      const subject = subjectMatch?.[1]?.trim() ?? note.title
      const body = note.content
        .replace(/^#\s+.+$/m, '')
        .replace(/^Subject:\s*.+$/im, '')
        .trim()
      return { id: note.id, title: note.title, subject, body }
    })
}

export async function generateTemplateWithAI(
  template: EmailTemplate,
  instruction: string,
  notes: Note[],
  emails: Email[],
  context?: { to?: string; replyTo?: Email },
): Promise<{ subject: string; body: string }> {
  const prompt = `Using this email template, ${instruction}

Template title: ${template.title}
Template subject: ${template.subject}
Template body:
${template.body}
${context?.to ? `\nRecipient: ${context.to}` : ''}
${context?.replyTo ? `\nReplying to: ${context.replyTo.fromName} — "${context.replyTo.subject}"` : ''}

Return ONLY the email body text (no markdown headers). Keep placeholders like [Name] if unsure.`

  const aiBody = await generateVaultAIResponse(prompt, notes, emails)
  const cleaned = aiBody
    .replace(/^---[\s\S]*?---\n?/m, '')
    .replace(/^\*\*Draft.*\*\*\n*/i, '')
    .trim()

  let subject = template.subject
  if (context?.replyTo && !subject.toLowerCase().startsWith('re:')) {
    subject = `Re: ${context.replyTo.subject}`
  }

  return { subject, body: cleaned }
}
