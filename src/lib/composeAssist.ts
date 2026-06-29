import type { Email, Note } from '../types'
import { generateVaultAIResponse } from './rag'

export type ComposeAssistAction = 'polish' | 'shorten' | 'expand' | 'friendly'

const PROMPTS: Record<ComposeAssistAction, string> = {
  polish: 'Polish and proofread this email draft. Fix grammar and clarity. Return ONLY the revised body text.',
  shorten: 'Make this email draft more concise while keeping key points. Return ONLY the shorter body text.',
  expand: 'Expand this email draft with helpful detail and a professional tone. Return ONLY the expanded body text.',
  friendly: 'Rewrite this email draft in a warm, friendly tone. Return ONLY the rewritten body text.',
}

export async function assistComposeBody(
  action: ComposeAssistAction,
  body: string,
  notes: Note[],
  emails: Email[],
  context?: { to?: string; subject?: string },
): Promise<string> {
  if (!body.trim()) {
    return 'Start writing your message, then use AI assist to refine it.'
  }

  const prompt = `${PROMPTS[action]}

${context?.to ? `Recipient: ${context.to}` : ''}
${context?.subject ? `Subject: ${context.subject}` : ''}

Draft:
${body}`

  const result = await generateVaultAIResponse(prompt, notes, emails)
  return result
    .replace(/^---[\s\S]*?---\n?/m, '')
    .replace(/^\*\*.*\*\*\n*/m, '')
    .trim()
}
