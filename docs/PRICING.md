# EtherMail pricing plan

Product positioning: **private vault + unified inbox + knowledge graph + Vault AI** — not a generic email client.

Monetization principle: **free enough to become a daily habit**; charge for sync depth, AI, and power-user features — never for reading your own mail or basic privacy.

---

## Tiers

| | **Free** | **Pro** ($15/mo · $120/yr) | **Team** ($12/user/mo · min 3) |
|---|:---:|:---:|:---:|
| Target | Students, hobbyists, evaluators | Consultants, founders, knowledge workers | Small teams, agencies |
| Connected mailboxes | 2 | Unlimited | Unlimited |
| Vaults (work / personal) | 2 | Unlimited | Unlimited + shared |
| Notes, `[[links]]`, graph | Full | Full | Full + shared folders |
| Calendar (ICS + invites) | Full | Full | Full |
| Email ↔ note linking | Full | Full | Full |
| Vault AI queries | 100 / month | Unlimited | Unlimited |
| External AI (BYOK) | Full | Full | Full |
| Background inbox sync | Manual sync only | Always on | Always on |
| Gmail / Outlook live sync | Connect + manual refresh | Background + push (future) | Background |
| Attachments in vault | 100 MB | 10 GB | 50 GB pooled |
| Contact graph density | Basic | Advanced filters | Shared team graph |
| Export (notes, ICS, mail) | Yes | Yes | Yes |
| Priority support | Community | Email | Email + SLA |
| SSO / admin | — | — | Yes |

---

## Feature matrix (code mapping)

Maps planned gates to current or upcoming implementation.

| Feature | Free | Pro | Code / area |
|---------|------|-----|-------------|
| Demo mail connect | Yes | Yes | `finishConnectAccount`, `gmailDemo.ts` |
| Gmail OAuth read sync | Yes (manual) | Background | `sync/gmail.ts`, `syncGmailInbox` |
| Outlook Graph sync | Yes (manual) | Background | Planned `sync/outlook.ts` |
| Multi-vault switcher | 2 vaults | Unlimited | `vaults`, `activeVaultId` |
| AI Inbox / Outbox filters | Yes | Yes | `aiInbox.ts`, `EmailView` |
| Vault RAG assistant | 100 q/mo | Unlimited | `rag.ts`, `plan.ts` |
| Thread view | Yes | Yes | `emailThreads.ts` |
| Scheduled send | Demo | Live send | `scheduledSend.ts` |
| ICS import/export | Yes | Yes | `ics.ts`, `CalendarView` |
| Graph person density | Yes | Advanced | `contactGraph.ts` |
| Shared vaults | — | — | Team · future |

---

## What we never paywall

- Reading or searching your own email and vault
- Exporting your data
- Core privacy (no ads, no data selling)
- Disconnecting accounts and deleting local data

---

## Conversion triggers (when to show upgrade)

1. User connects a **3rd mailbox** → Pro
2. User hits **AI query cap** → Pro or AI pack
3. User enables **background sync** → Pro
4. User creates a **3rd vault** → Pro
5. User invites a teammate → Team

---

## Optional add-ons (later)

| Add-on | Price | Notes |
|--------|-------|-------|
| AI query pack | $5 / 500 queries | For free users who don’t want full Pro |
| Founding member (limited) | $99 / year lifetime | Early beta only, capped seats |
| Enterprise | Custom | SSO, DLP, admin consent at scale |

---

## Rollout phases

| Phase | Focus | Billing |
|-------|--------|---------|
| **A (now)** | Gmail demo + OAuth read sync, vault, graph | None |
| **B** | Supabase backend, secure tokens, plan enforcement | Stripe test mode |
| **C** | Public launch, Pro live, Google OAuth verification | Stripe production |
| **D** | Team vaults, onboarding wizard | Team tier |

---

## Competitive anchor

- Cheaper than Superhuman (~$30/mo) with a broader product (vault + graph + AI).
- More capable than Obsidian Sync for mail-centric workflows.
- Privacy story stronger than Notion Mail (local-first RAG, no training on your mail).
