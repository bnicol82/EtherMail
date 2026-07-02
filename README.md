# EtherMail

**Obsidian-style knowledge vault** with unified email, knowledge graph, and private RAG AI — Phase 1 MVP.

## Live Demo

After enabling GitHub Pages, the app will be available at:

**https://bnicol82.github.io/EtherMail/**

## Phase 1 Features

- **Vault** — Markdown notes, folders, bi-directional `[[links]]`, tags, backlinks, edit/preview/split modes
- **Email** — Unified inbox (demo data), link emails to notes, AI actions
- **Knowledge Graph** — Interactive graph of notes, emails, people, and tags
- **Vault AI (RAG)** — Private assistant that searches your vault and inbox (client-side hybrid retrieval)
- **External AI** — API key settings for OpenAI/Anthropic/Google (demo responses on Pages)
- **Command Bar** — `⌘K` / `/` global search and commands
- **Mobile** — Responsive layout with collapsible navigation

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages Setup

> **Required once per repo.** The deploy workflow fails with `404 Not Found` until Pages is enabled.

1. Open **[EtherMail → Settings → Pages](https://github.com/bnicol82/EtherMail/settings/pages)**
2. Under **Build and deployment → Source**, choose **GitHub Actions** (not “Deploy from a branch”)
3. Save, then re-run the workflow:
   - **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

The site will be live at **https://bnicol82.github.io/EtherMail/** after a successful deploy.

## Enterprise API (local dev)

Run the org policy API alongside Vite for server-backed admin sync:

```bash
# Terminal 1
npm run org-api

# Terminal 2
npm run dev
```

`.env.development` sets `VITE_ORG_API_URL=/api` (proxied to `localhost:8787`). Admin → **Sync policy from API** pulls policy, members, vault shares, and audit events.

Server-side gates: when the org API is connected, compose send and AI queries also check `POST /org/gate/check` for authoritative policy enforcement. All gated store actions use client + server checks via `withFullGate`.

When **Enforce SSO** is enabled, members without an org session see a login gate. Supabase access tokens refresh automatically via `POST /org/auth/refresh`. Validate sessions on load via `GET /org/session`. Server-side AI quota limits are enforced on `POST /org/gate/check` for `vault_ai` / `external_ai`. Mailbox connect quotas use `metadata.connectedMailboxes`. View usage in Admin → **Usage** (`GET /org/usage`). Members only see shared vaults they are assigned to.

### SSO secrets (production)

Set on the org API server or Supabase Edge Function:

- `SSO_ENTRA_CLIENT_SECRET` — Microsoft Entra
- `SSO_OKTA_CLIENT_SECRET` — Okta
- `SSO_GOOGLE_CLIENT_SECRET` — Google Workspace

When secrets are set, authorization codes are exchanged for tokens and `id_token` signatures are validated against provider JWKS.

SSO login also bridges to **Supabase Auth** when deployed on Supabase: the edge function creates/links an `auth.users` row, returns Supabase access/refresh tokens, and accepts `Authorization: Bearer` on org API requests (alongside `X-EtherMail-Session`).

## Supabase deployment (production)

1. `supabase link` and `supabase db push` (migrations `001`–`004`)
2. `supabase functions deploy org-api`
3. Set secrets: `SSO_ENTRA_CLIENT_SECRET`, `SSO_OKTA_CLIENT_SECRET`, or `SSO_GOOGLE_CLIENT_SECRET`
4. Point `VITE_ORG_API_URL` at `https://<project>.supabase.co/functions/v1/org-api`

Or trigger **Deploy Supabase** in GitHub Actions (requires `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` repository secrets).

## Roadmap

| Phase | Features |
|-------|----------|
| **1** (current) | Vault, demo email, RAG AI, graph, command bar |
| **2** (in progress) | OAuth connect, calendar sync from emails, Email Files vault |
| **3** | AI Bridge mode, teams, enterprise Outlook, live API sync |
| **4** | Plugins, web clipper, OCR |

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Zustand (state + localStorage persistence)
- Canvas-based graph visualization
