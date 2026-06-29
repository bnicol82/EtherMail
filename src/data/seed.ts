import type { Email, EmailAccount, EmailAttachment, Folder, GraphEdge, GraphNode, Note, CalendarEvent } from '../types'
import { EMAIL_FILES_FOLDER_ID } from '../types'

export const SEED_FOLDERS: Folder[] = [
  { id: 'root', name: "Sarah J's Personal Vault", parentId: null },
  { id: EMAIL_FILES_FOLDER_ID, name: 'Email Files', parentId: 'root', isSystem: true },
  { id: 'templates', name: 'Templates', parentId: 'root' },
  { id: 'archives', name: 'Archives', parentId: 'root' },
  { id: 'projects', name: 'Projects', parentId: 'root' },
  { id: 'athena', name: 'Project Athena', parentId: 'projects' },
]

export const SEED_NOTES: Note[] = [
  {
    id: 'note-research',
    title: 'Research Notes',
    folderId: 'athena',
    tags: ['#q3', '#marketing', '#data'],
    createdAt: '2026-06-10T09:00:00Z',
    updatedAt: '2026-06-27T14:30:00Z',
    content: `# Research Notes

## Overview
Competitive analysis and data strategy for Project Athena Q3 initiative.

## Data Strategy Comparison

| Approach | Cost | Speed | Accuracy |
|----------|------|-------|----------|
| Batch ETL | Low | Slow | High |
| Real-time Stream | High | Fast | Medium |
| Hybrid | Medium | Medium | High |

## Action Items
- [x] Review competitor pricing models
- [x] Interview 3 enterprise customers
- [ ] Finalize data pipeline architecture
- [ ] Present findings to leadership

## API Snippets

\`\`\`javascript
async function fetchMetrics(period) {
  const res = await fetch(\`/api/metrics?q=\${period}\`);
  return res.json();
}
\`\`\`

## Related
See also [[Q3 Marketing Strategy]] and [[Competitive Analysis]].

Key contact: Sarah J. on budget alignment for [[Budget Q4]].
`,
  },
  {
    id: 'note-q3-marketing',
    title: 'Q3 Marketing Strategy',
    folderId: 'athena',
    tags: ['#q3', '#marketing'],
    createdAt: '2026-06-05T11:00:00Z',
    updatedAt: '2026-06-26T16:00:00Z',
    content: `# Q3 Marketing Strategy

## Goals
1. Increase enterprise pipeline by 40%
2. Launch Athena product line in 3 new regions
3. Improve content-to-conversion rate

## Channels
- **Email nurture** — linked to [[Email-Q3 Plan]] thread
- **Webinars** — monthly thought leadership
- **Partner co-marketing** — expand reach

## Budget
Allocated $120K for Q3 campaigns. See [[Budget Q4]] for rollover planning.

## Team
- Sarah J. — Strategy lead
- Marketing ops — execution

Connected to [[Research Notes]] for competitive positioning.
`,
  },
  {
    id: 'note-competitive',
    title: 'Competitive Analysis',
    folderId: 'athena',
    tags: ['#data', '#research'],
    createdAt: '2026-06-08T10:00:00Z',
    updatedAt: '2026-06-20T12:00:00Z',
    content: `# Competitive Analysis

## Top Competitors
1. **NovaSync** — Strong enterprise, weak mobile
2. **KnowledgeBase Pro** — Great PKM, no email integration
3. **InboxIQ** — Email-first, no graph view

## Our Advantage
Unified vault + email + private AI (RAG) in one workspace.

Referenced in [[Research Notes]].
`,
  },
  {
    id: 'note-budget',
    title: 'Budget Q4',
    folderId: 'projects',
    tags: ['#budget', '#q3'],
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-06-25T09:00:00Z',
    content: `# Budget Q4

## Q3 Spend Summary
- Marketing: $95K / $120K
- Engineering: $180K
- Operations: $45K

## Q4 Planning
Rollover $25K marketing budget. Submit expenses by June 30.

Linked to [[Q3 Marketing Strategy]] and expense reminder emails.
`,
  },
  {
    id: 'note-meeting',
    title: 'Meeting Minutes',
    folderId: 'athena',
    tags: ['#meetings'],
    createdAt: '2026-06-14T15:00:00Z',
    updatedAt: '2026-06-14T16:30:00Z',
    content: `# Project Sync — June 14

## Attendees
Sarah J., Team leads

## Discussion
- Reviewed [[Research Notes]] findings
- Aligned on [[Q3 Marketing Strategy]] timeline
- Budget review per [[Budget Q4]]

## Action Items
- [ ] Sarah to send project update email
- [ ] Schedule client meeting for next week
`,
  },
]

export const SEED_ACCOUNTS: EmailAccount[] = [
  { id: 'acc-gmail', email: 'name@gmail.com', provider: 'gmail', connected: true },
  { id: 'acc-outlook', email: 'work@corp.com', provider: 'enterprise', connected: true },
  { id: 'acc-yahoo', email: 'user@yahoo.com', provider: 'yahoo', connected: false },
]

export const SEED_ATTACHMENTS: EmailAttachment[] = [
  {
    id: 'att-1',
    emailId: 'email-1',
    accountId: 'acc-outlook',
    filename: 'Q3_Strategy_Draft.pdf',
    sizeBytes: 2_450_000,
    mimeType: 'application/pdf',
    date: '2026-06-27T10:30:00Z',
  },
  {
    id: 'att-2',
    emailId: 'email-1',
    accountId: 'acc-outlook',
    filename: 'Athena_Roadmap.xlsx',
    sizeBytes: 890_000,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    date: '2026-06-27T10:30:00Z',
  },
  {
    id: 'att-3',
    emailId: 'email-2',
    accountId: 'acc-gmail',
    filename: 'Expense_Report_Template.xlsx',
    sizeBytes: 124_000,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    date: '2026-06-26T08:00:00Z',
  },
  {
    id: 'att-4',
    emailId: 'email-2',
    accountId: 'acc-gmail',
    filename: 'receipts_q2.zip',
    sizeBytes: 4_100_000,
    mimeType: 'application/zip',
    date: '2026-06-26T08:00:00Z',
  },
  {
    id: 'att-5',
    emailId: 'email-3',
    accountId: 'acc-outlook',
    filename: 'Research_Summary_Excerpt.pdf',
    sizeBytes: 560_000,
    mimeType: 'application/pdf',
    date: '2026-06-25T14:15:00Z',
  },
  {
    id: 'att-6',
    emailId: 'email-5',
    accountId: 'acc-outlook',
    filename: 'Budget_Review_Agenda.docx',
    sizeBytes: 78_000,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    date: '2026-06-23T11:00:00Z',
  },
  {
    id: 'att-7',
    emailId: 'email-5',
    accountId: 'acc-outlook',
    filename: 'invite.ics',
    sizeBytes: 4_200,
    mimeType: 'text/calendar',
    date: '2026-06-23T11:00:00Z',
  },
]

export const SEED_EMAILS: Email[] = [
  {
    id: 'email-1',
    accountId: 'acc-outlook',
    from: 'sarah.j@corp.com',
    fromName: 'Sarah J.',
    to: 'you@corp.com',
    subject: 'Project Update — Athena Q3',
    preview: 'Hi team, quick update on the Q3 marketing strategy and next steps for Project Athena...',
    body: `Hi team,

Quick update on the Q3 marketing strategy and next steps for Project Athena.

We've finalized the competitive positioning based on our research. Key highlights:
- Enterprise pipeline target: +40%
- Three new regional launches planned
- Budget alignment with Q4 rollover

Please review the attached strategy doc and the linked research notes. I'd like everyone's feedback by Friday.

Let's sync in our Project Sync meeting on Monday.

Best,
Sarah J.`,
    date: '2026-06-27T10:30:00Z',
    read: false,
    starred: true,
    linkedNoteId: 'note-q3-marketing',
    attachmentIds: ['att-1', 'att-2'],
  },
  {
    id: 'email-2',
    accountId: 'acc-gmail',
    from: 'finance@corp.com',
    fromName: 'Finance Team',
    to: 'name@gmail.com',
    subject: 'Reminder: Submit Expenses by June 30',
    preview: 'This is a friendly reminder to submit your Q2 expense reports...',
    body: `This is a friendly reminder to submit your Q2 expense reports by June 30.

Unsubmitted reports may delay reimbursement. Please include receipts for all items over $25.

Related budget items should reference your Q4 budget planning notes.

Thanks,
Finance Team`,
    date: '2026-06-26T08:00:00Z',
    read: true,
    starred: false,
    linkedNoteId: 'note-budget',
    attachmentIds: ['att-3', 'att-4'],
  },
  {
    id: 'email-3',
    accountId: 'acc-outlook',
    from: 'client@acme.com',
    fromName: 'Acme Corp',
    to: 'work@corp.com',
    subject: 'Re: Client Meeting — Project Athena',
    preview: 'Looking forward to our meeting next week. Can you share the research summary beforehand?',
    body: `Looking forward to our meeting next week.

Can you share the research summary beforehand? We'd like to review the competitive analysis section specifically.

Thanks,
Acme Corp Team`,
    date: '2026-06-25T14:15:00Z',
    read: true,
    starred: false,
    linkedNoteId: 'note-research',
    attachmentIds: ['att-5'],
  },
  {
    id: 'email-4',
    accountId: 'acc-gmail',
    from: 'newsletter@tech.com',
    fromName: 'Tech Weekly',
    to: 'name@gmail.com',
    subject: 'This Week in AI: RAG Systems Explained',
    preview: 'Retrieval-augmented generation is transforming how AI assistants access private data...',
    body: `Retrieval-augmented generation is transforming how AI assistants access private data securely.

This week we cover hybrid search, vector databases, and privacy-first AI architectures.

Read more at techweekly.com`,
    date: '2026-06-24T06:00:00Z',
    read: true,
    starred: false,
    linkedNoteId: null,
  },
  {
    id: 'email-5',
    accountId: 'acc-outlook',
    from: 'calendar@corp.com',
    fromName: 'Calendar',
    to: 'work@corp.com',
    subject: 'Invitation: Budget Review — Thu 17th 2pm',
    preview: 'You have been invited to Budget Review. Attendees: Sarah J., Finance team...',
    body: `You have been invited to Budget Review.

When: Thursday, June 17th, 2:00 PM
Attendees: Sarah J., Finance team

Agenda:
- Q3 spend review
- Q4 budget allocation
- Expense submission deadline

This event relates to your Budget Q4 planning notes.`,
    date: '2026-06-23T11:00:00Z',
    read: false,
    starred: false,
    linkedNoteId: 'note-budget',
    attachmentIds: ['att-6', 'att-7'],
  },
]

export const SEED_CALENDAR: CalendarEvent[] = [
  {
    id: 'cal-1',
    title: 'Project Sync',
    start: '2026-06-30T10:00:00',
    end: '2026-06-30T11:00:00',
    attendees: ['Sarah J.', 'Team leads'],
  },
  {
    id: 'cal-2',
    title: 'Budget Review',
    start: '2026-06-30T14:00:00',
    end: '2026-06-30T15:00:00',
    attendees: ['Sarah J.', 'Finance team'],
  },
  {
    id: 'cal-3',
    title: 'Client Meeting',
    start: '2026-07-01T11:00:00',
    end: '2026-07-01T12:00:00',
    attendees: ['Acme Corp'],
  },
  {
    id: 'cal-4',
    title: 'Team Standup',
    start: '2026-07-02T09:00:00',
    end: '2026-07-02T09:30:00',
  },
]

export function buildGraphFromData(notes: Note[], emails: Email[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  const addNode = (node: GraphNode) => {
    if (!seen.has(node.id)) {
      seen.add(node.id)
      nodes.push(node)
    }
  }

  notes.forEach((note) => {
    addNode({ id: note.id, label: note.title, type: 'note' })
    note.tags.forEach((tag) => {
      const tagId = `tag-${tag}`
      addNode({ id: tagId, label: tag, type: 'tag' })
      edges.push({ id: `${note.id}-${tagId}`, source: note.id, target: tagId, type: 'tagged' })
    })
    const linkRegex = /\[\[([^\]]+)\]\]/g
    let match
    while ((match = linkRegex.exec(note.content)) !== null) {
      const linkedTitle = match[1]
      const linked = notes.find((n) => n.title === linkedTitle)
      if (linked) {
        edges.push({
          id: `${note.id}-${linked.id}`,
          source: note.id,
          target: linked.id,
          type: 'links_to',
        })
      }
    }
  })

  emails.forEach((email) => {
    addNode({ id: email.id, label: email.subject.slice(0, 30), type: 'email' })
    const personId = `person-${email.from}`
    addNode({ id: personId, label: email.fromName, type: 'person' })
    edges.push({ id: `${email.id}-${personId}`, source: personId, target: email.id, type: 'from' })
    if (email.linkedNoteId) {
      edges.push({
        id: `${email.id}-${email.linkedNoteId}`,
        source: email.id,
        target: email.linkedNoteId,
        type: 'references',
      })
    }
  })

  return { nodes, edges }
}
