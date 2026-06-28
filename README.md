# Nexus Core (EtherMail)

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

## Roadmap

| Phase | Features |
|-------|----------|
| **1** (current) | Vault, demo email, RAG AI, graph, command bar |
| **2** | Real OAuth (Gmail, Outlook, Yahoo), calendar sync |
| **3** | AI Bridge mode, teams, enterprise Outlook |
| **4** | Plugins, web clipper, OCR |

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Zustand (state + localStorage persistence)
- Canvas-based graph visualization
