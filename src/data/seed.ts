import type {
  CalendarEvent,
  ChatMessage,
  Email,
  EmailAccount,
  EmailAttachment,
  EmailLabel,
  Folder,
  Note,
  Vault,
} from '../types'
import { EMAIL_FILES_FOLDER_ID } from '../types'

export const SEED_VAULTS: Vault[] = [
  { id: 'vault-personal', name: 'Personal', kind: 'personal' },
  { id: 'vault-work', name: 'Work', kind: 'work' },
]

export const VAULT_PERSONAL_ID = 'vault-personal'
export const VAULT_WORK_ID = 'vault-work'
export const ROOT_PERSONAL_ID = 'root'
export const ROOT_WORK_ID = 'root-work'
export const EMAIL_FILES_WORK_FOLDER_ID = 'email-files-work'

export const DAILY_FOLDER_ID = 'daily'

export const SEED_FOLDERS: Folder[] = [
  { id: ROOT_PERSONAL_ID, name: 'Personal', parentId: null, vaultId: VAULT_PERSONAL_ID },
  { id: EMAIL_FILES_FOLDER_ID, name: 'Email Files', parentId: ROOT_PERSONAL_ID, vaultId: VAULT_PERSONAL_ID, isSystem: true },
  { id: 'templates', name: 'Templates', parentId: ROOT_PERSONAL_ID, vaultId: VAULT_PERSONAL_ID },
  { id: DAILY_FOLDER_ID, name: 'Daily Notes', parentId: ROOT_PERSONAL_ID, vaultId: VAULT_PERSONAL_ID },
  { id: 'archives', name: 'Archives', parentId: ROOT_PERSONAL_ID, vaultId: VAULT_PERSONAL_ID },
  { id: 'personal', name: 'Life & Hobbies', parentId: ROOT_PERSONAL_ID, vaultId: VAULT_PERSONAL_ID },
  { id: ROOT_WORK_ID, name: 'Work', parentId: null, vaultId: VAULT_WORK_ID },
  { id: EMAIL_FILES_WORK_FOLDER_ID, name: 'Email Files', parentId: ROOT_WORK_ID, vaultId: VAULT_WORK_ID, isSystem: true },
  { id: 'projects', name: 'Projects', parentId: ROOT_WORK_ID, vaultId: VAULT_WORK_ID },
  { id: 'athena', name: 'Project Athena', parentId: 'projects', vaultId: VAULT_WORK_ID },
]

export const SEED_EMAIL_LABELS: EmailLabel[] = [
  { id: 'label-athena', name: 'Project Athena', color: '#6366f1' },
  { id: 'label-finance', name: 'Finance', color: '#10b981' },
  { id: 'label-urgent', name: 'Urgent', color: '#ef4444' },
  { id: 'label-followup', name: 'Follow-up', color: '#f59e0b' },
]

export const SEED_NOTES: Note[] = [
  {
    id: 'note-research',
    title: 'Research Notes',
    folderId: 'athena',
    vaultId: VAULT_WORK_ID,
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
    vaultId: VAULT_WORK_ID,
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
    vaultId: VAULT_WORK_ID,
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
    vaultId: VAULT_WORK_ID,
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
    vaultId: VAULT_WORK_ID,
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
  {
    id: 'note-tpl-followup',
    title: 'Follow-up Template',
    folderId: 'templates',
    vaultId: VAULT_PERSONAL_ID,
    tags: ['#template', '#email'],
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-20T10:00:00Z',
    content: `# Re: Follow-up on our conversation

Hi [Name],

Thanks again for taking the time to meet. I wanted to follow up on the points we discussed:

- [Key point 1]
- [Key point 2]

Please let me know if you have any questions. Happy to jump on a quick call this week.

Best regards,
[Your name]`,
  },
  {
    id: 'note-tpl-meeting',
    title: 'Meeting Request Template',
    folderId: 'templates',
    vaultId: VAULT_PERSONAL_ID,
    tags: ['#template', '#email'],
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-20T10:00:00Z',
    content: `# Meeting request — [Topic]

Hi [Name],

I'd like to schedule a brief meeting to discuss [topic]. Would any of these times work for you?

- [Option 1]
- [Option 2]

Looking forward to connecting.

Thanks,
[Your name]`,
  },
  {
    id: 'note-tpl-status',
    title: 'Project Status Update',
    folderId: 'templates',
    vaultId: VAULT_PERSONAL_ID,
    tags: ['#template', '#email'],
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-20T10:00:00Z',
    content: `# Project Update — [Project Name]

Hi team,

Quick status update on [Project Name]:

**Progress**
- [Completed item]
- [In progress item]

**Next steps**
- [Action 1]
- [Action 2]

**Blockers**
- None / [Describe blocker]

Let me know if you have questions before our next sync.

Best,
[Your name]`,
  },
  {
    id: 'note-weekend',
    title: 'Weekend Plans',
    folderId: 'personal',
    vaultId: VAULT_PERSONAL_ID,
    tags: ['#personal'],
    createdAt: '2026-06-20T12:00:00Z',
    updatedAt: '2026-06-27T18:00:00Z',
    content: `# Weekend Plans

## Ideas
- Hiking at Redwood trail
- Farmers market Saturday morning
- Dinner with friends Sunday

## People
Catch up with the weekend group — see related emails from **Weekend Plans**.
`,
  },
]

export const SEED_ACCOUNTS: EmailAccount[] = [
  {
    id: 'acc-gmail',
    email: 'name@gmail.com',
    provider: 'gmail',
    connected: true,
    connectedAt: '2026-06-01T00:00:00Z',
    syncMode: 'demo',
    defaultVaultId: VAULT_PERSONAL_ID,
  },
  {
    id: 'acc-outlook',
    email: 'work@corp.com',
    provider: 'enterprise',
    connected: true,
    connectedAt: '2026-06-01T00:00:00Z',
    syncMode: 'demo',
    defaultVaultId: VAULT_WORK_ID,
  },
  { id: 'acc-yahoo', email: 'user@yahoo.com', provider: 'yahoo', connected: false, defaultVaultId: VAULT_PERSONAL_ID },
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
    to: 'work@corp.com',
    cc: 'team@corp.com, client@acme.com',
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
    labelIds: ['label-athena'],
  },
  {
    id: 'email-1-reply',
    accountId: 'acc-outlook',
    from: 'sarah.j@corp.com',
    fromName: 'Sarah J.',
    to: 'work@corp.com',
    subject: 'Re: Project Update — Athena Q3',
    preview: 'Thanks for the quick review — can you also loop in the design team on the regional launch slides?',
    body: `Thanks for the quick review!

Can you also loop in the design team on the regional launch slides before Monday's sync? I want their input on the visual direction for the three markets.

Best,
Sarah J.`,
    date: '2026-06-27T16:30:00Z',
    read: false,
    starred: false,
    linkedNoteId: 'note-q3-marketing',
    labelIds: ['label-athena'],
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
    labelIds: ['label-finance', 'label-urgent'],
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
    cc: 'sarah.j@corp.com, finance@corp.com',
    subject: 'Invitation: Budget Review — Thu 17th 2pm',
    preview: 'You have been invited to Budget Review. Attendees: Sarah J., Finance team...',
    body: `You have been invited to Budget Review.

When: Thursday, June 30th, 2:00 PM
Location: Finance Building
Room: 201
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
    folder: 'inbox',
    labelIds: ['label-finance', 'label-athena'],
  },
  {
    id: 'email-6',
    accountId: 'acc-outlook',
    from: 'sarah.j@corp.com',
    fromName: 'Sarah J.',
    to: 'work@corp.com',
    subject: 'Quick question — deck for Monday sync?',
    preview: 'Can you pull the latest Q3 slides into one deck before our Project Sync on Monday?',
    body: `Hey,

Can you pull the latest Q3 slides into one deck before our Project Sync on Monday?

Ideally combine:
- The marketing strategy highlights from last week's email
- Competitive positioning from Research Notes
- Budget snapshot from Finance

No need for a novel — just something we can walk through in 30 minutes.

Thanks!
Sarah`,
    date: '2026-06-28T09:15:00Z',
    read: false,
    starred: false,
    linkedNoteId: 'note-q3-marketing',
  },
  {
    id: 'email-7',
    accountId: 'acc-gmail',
    from: 'alex.k@corp.com',
    fromName: 'Alex Kim',
    to: 'name@gmail.com',
    subject: 'Re: Expense report — looks good',
    preview: 'Approved your Q2 expenses. Finance will process by Friday.',
    body: `Approved your Q2 expenses — looks good.

Finance will process reimbursement by Friday. Let me know if anything is missing.

— Alex`,
    date: '2026-06-28T08:00:00Z',
    read: true,
    starred: false,
    linkedNoteId: 'note-budget',
    acknowledgements: [
      {
        id: 'ack-seed-2',
        fromName: 'You',
        status: 'emoji',
        label: '👍',
        emoji: '👍',
        timestamp: '2026-06-28T08:05:00Z',
      },
      {
        id: 'ack-seed-3',
        fromName: 'Alex Kim',
        status: 'received',
        label: 'Got it',
        timestamp: '2026-06-28T08:06:00Z',
      },
    ],
  },
  {
    id: 'email-junk-spam',
    accountId: 'acc-gmail',
    from: 'prizes@lottery-winner.biz',
    fromName: 'International Lottery',
    to: 'name@gmail.com',
    subject: 'CONGRATULATIONS! You won $2,500,000 — Claim now',
    preview: 'You have been selected as our grand prize winner. Wire transfer details inside...',
    body: `CONGRATULATIONS!

You have WON $2,500,000 in the International Email Lottery!

Click here immediately to claim your prize. Send us your bank details and a small processing fee.

Act now — offer expires in 24 hours!`,
    date: '2026-06-28T05:00:00Z',
    read: false,
    starred: false,
    linkedNoteId: null,
  },
  {
    id: 'email-junk-marketing',
    accountId: 'acc-gmail',
    from: 'deals@megastore.com',
    fromName: 'MegaStore Deals',
    to: 'name@gmail.com',
    subject: 'FLASH SALE — 70% OFF everything (limited time!)',
    preview: 'Shop now and save big. Free shipping on orders over $25. Act now...',
    body: `FLASH SALE — 70% OFF EVERYTHING!

Limited time only. Shop now and save big on electronics, home goods, and more.

Unsubscribe | View in browser`,
    date: '2026-06-28T04:30:00Z',
    read: false,
    starred: false,
    linkedNoteId: null,
  },
  {
    id: 'email-junk-phishing',
    accountId: 'acc-outlook',
    from: 'security-alert@paypa1-verify.net',
    fromName: 'Account Security',
    to: 'work@corp.com',
    subject: 'URGENT: Verify your account — unusual sign-in detected',
    preview: 'We noticed unusual activity. Click here immediately to verify your password...',
    body: `Security Alert

We detected unusual sign-in activity on your account.

Click here immediately to verify your password and download the attached invoice.exe to restore access.

If you do not act within 12 hours your account will be suspended.`,
    date: '2026-06-28T03:00:00Z',
    read: false,
    starred: false,
    linkedNoteId: null,
  },
  {
    id: 'email-junk-social',
    accountId: 'acc-gmail',
    from: 'notifications@linkedin.com',
    fromName: 'LinkedIn',
    to: 'name@gmail.com',
    subject: 'Someone viewed your profile this week',
    preview: '5 people viewed your profile. See who and grow your network...',
    body: `Your weekly LinkedIn notification

5 people viewed your profile this week.

Grow your network — connect with suggested colleagues.`,
    date: '2026-06-27T18:00:00Z',
    read: true,
    starred: false,
    linkedNoteId: null,
  },
  {
    id: 'email-junk-promo',
    accountId: 'acc-gmail',
    from: 'promo@fitness-app.io',
    fromName: 'FitLife Pro',
    to: 'name@gmail.com',
    subject: 'Your free trial ends tomorrow — 50% off annual plan',
    preview: "Don't miss out! Exclusive offer for loyal users. Upgrade today...",
    body: `Your free trial ends tomorrow!

Upgrade now and get 50% off our annual plan. Exclusive promotional offer just for you.

Unsubscribe from promotional emails.`,
    date: '2026-06-27T12:00:00Z',
    read: true,
    starred: false,
    linkedNoteId: null,
  },
  {
    id: 'email-sent-1',
    accountId: 'acc-outlook',
    from: 'work@corp.com',
    fromName: 'You',
    to: 'sarah.j@corp.com',
    subject: 'Re: Project Update — Athena Q3',
    preview: 'Thanks Sarah — reviewed the strategy doc and left comments in the vault...',
    body: `Thanks Sarah,

Reviewed the strategy doc and left comments in the vault note.

Looks good overall. I'll sync with the team before Friday.

Best`,
    date: '2026-06-27T15:00:00Z',
    read: true,
    starred: false,
    linkedNoteId: 'note-q3-marketing',
    folder: 'sent',
    acknowledgements: [
      {
        id: 'ack-seed-1',
        fromName: 'Sarah J.',
        status: 'received',
        label: 'Received it',
        timestamp: '2026-06-27T15:12:00Z',
      },
    ],
  },
]

/** Imported when Yahoo account is connected via OAuth */
export const SEED_YAHOO_EMAILS: Email[] = [
  {
    id: 'email-yahoo-1',
    accountId: 'acc-yahoo',
    from: 'friends@group.com',
    fromName: 'Weekend Plans',
    to: 'user@yahoo.com',
    subject: 'Re: Hiking trip this Saturday',
    preview: 'Count me in! What time are we meeting at the trailhead?',
    body: `Count me in for Saturday!

What time are we meeting at the trailhead? I'll bring snacks.

See you there!`,
    date: '2026-06-28T07:30:00Z',
    read: false,
    starred: false,
    linkedNoteId: null,
  },
  {
    id: 'email-yahoo-2',
    accountId: 'acc-yahoo',
    from: 'store@retailer.com',
    fromName: 'Outdoor Gear Co',
    to: 'user@yahoo.com',
    subject: 'Your order has shipped',
    preview: 'Track your hiking gear — arriving by July 2...',
    body: `Your order #48291 has shipped.

Estimated delivery: July 2, 2026

Items: Trail boots, day pack

Track at retailer.com/orders`,
    date: '2026-06-27T16:00:00Z',
    read: true,
    starred: false,
    linkedNoteId: null,
  },
  {
    id: 'email-yahoo-3',
    accountId: 'acc-yahoo',
    from: 'calendar@yahoo.com',
    fromName: 'Yahoo Calendar',
    to: 'user@yahoo.com',
    subject: 'Invitation: Family BBQ — Sun 29th 1pm',
    preview: 'You have been invited to Family BBQ...',
    body: `You have been invited to Family BBQ.

When: Sunday, June 29th, 1:00 PM
Attendees: Family group

Bring a side dish!`,
    date: '2026-06-26T12:00:00Z',
    read: false,
    starred: true,
    linkedNoteId: null,
  },
]

export function getDemoEmailsForAccount(accountId: string): Email[] {
  if (accountId === 'acc-yahoo') return SEED_YAHOO_EMAILS
  return []
}

/** Sample chat thread shown after using bottom-dock quick reply on Sarah's email */
export const SEED_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-seed-quick-1',
    role: 'user',
    content: 'Draft a short reply to Sarah about the deck',
    mode: 'vault',
    timestamp: '2026-06-28T09:20:00Z',
  },
  {
    id: 'msg-seed-quick-2',
    role: 'assistant',
    content: `Here's a concise reply you can send to **Sarah J.** about the Monday deck:

---

Hi Sarah,

I'll pull together a single deck for Monday's Project Sync — marketing highlights, competitive positioning from Research Notes, and the budget snapshot from Finance.

I'll share a draft by Sunday evening so you have time to skim before the meeting.

Best`,
    mode: 'vault',
    timestamp: '2026-06-28T09:20:02Z',
  },
]

/** Shown in the bottom dock quick-reply panel on first load */
export const SEED_AI_CONTEXT_RESPONSE = SEED_CHAT_MESSAGES[1].content

export const SEED_CALENDAR: CalendarEvent[] = [
  {
    id: 'cal-1',
    uid: 'cal-1@ethermail',
    title: 'Project Sync',
    start: '2026-06-30T10:00:00',
    end: '2026-06-30T11:00:00',
    attendees: ['Sarah J.', 'Alex Kim', 'Team leads'],
    location: 'HQ — East Wing',
    room: '4B',
  },
  {
    id: 'cal-2',
    uid: 'cal-2@ethermail',
    title: 'Budget Review',
    start: '2026-06-30T14:00:00',
    end: '2026-06-30T15:00:00',
    attendees: ['Sarah J.', 'Finance team', 'Alex Kim'],
    location: 'Finance Building',
    room: '201',
    sourceEmailId: 'email-5',
  },
  {
    id: 'cal-3',
    uid: 'cal-3@ethermail',
    title: 'Client Meeting',
    start: '2026-07-01T11:00:00',
    end: '2026-07-01T12:00:00',
    attendees: ['Acme Corp'],
    location: 'Virtual — Teams',
    room: 'Bridge A',
  },
  {
    id: 'cal-4',
    uid: 'cal-4@ethermail',
    title: 'Team Standup',
    start: '2026-07-02T09:00:00',
    end: '2026-07-02T09:30:00',
    location: 'HQ — East Wing',
    room: '2A',
  },
]

export { buildContactGraph as buildGraphFromData } from '../lib/contactGraph'
