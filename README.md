# KG Editor - PoC

A low-barrier, role-based knowledge graph editing tool for domain experts, built as a proof-of-concept for a research-institute interview.

## What it demonstrates

- Role-based editing of a circularity/materials/supply-chain knowledge graph
- Low-barrier UX for users who are not familiar with RDF, SPARQL, or SHACL
- Nielsen heuristic-driven design, including page-level UX helper explanations
- SHACL-inspired constraint validation on client and server from plain JSON config
- Graph previews across core pages and detail contexts (1-hop and connected modes)
- Lightweight in-app feedback capture linked to page context and referenced records

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Nuxt 3 (Nuxt 4 compatibility mode) + Vue 3 |
| Language | TypeScript |
| Styling | Tailwind CSS + `@tailwindcss/forms` |
| State | Nuxt composables + `localStorage` for drafts/feedback |
| Backend | Nitro server routes + in-memory store (no database) |
| Data | Local JSON files in `data/` |

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Main pages

- `/` Dashboard with workload/status overview, graph visual, and glossary
- `/entities` Record list with filters, table actions, and graph visual
- `/entities/:id` Record detail/editor with status controls, audit, and scoped graph view
- `/review` Curator review queue with diff panel and graph context
- `/admin/shapes` Shape/constraint inspector and graph context
- `/admin/feedback` Feedback inbox for collected user comments

## New UX additions

### Graph preview card

- Available on core pages with page-specific focus and style variant
- Two modes:
  - `1-hop`: direct neighbors around the focus node
  - `Connected`: reachable subgraph within the currently loaded page dataset
- Context note clarifies:
  - which node is used as focus,
  - whether it was page-provided or auto-selected,
  - and the scope boundaries of the visualization.

### UX helper panel

- Added to each main page behind a show/hide toggle
- Explains page intent and primary Nielsen heuristics used

### Feedback feature

- Floating feedback widget to capture comments on:
  - dataset quality/content,
  - UI/interaction,
  - workflow/process,
  - bug/error reports,
  - other suggestions
- Entries store local metadata including:
  - page path,
  - optional referenced record ID,
  - category and free-text message
- Feedback inbox at `/admin/feedback` supports filtering and links back to context

## Scripts

```bash
npm run dev
npm run build
npm run generate
npm run preview
npm run lint
```

## GitHub Pages deployment

This repo includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that:

1. installs dependencies,
2. runs `npm run generate`,
3. uploads `.output/public`,
4. deploys to GitHub Pages.

Base path is set automatically in CI:
- `https://<user>.github.io/<repo>/` for project pages
- `/` for `<user>.github.io` repositories

See [docs/deployment.md](docs/deployment.md) for setup details and static-hosting limitations.

## Notes

- State is in-memory on server for this PoC and resets on server restart.
- On static hosting (GitHub Pages), mutation APIs are not available; use it as a read/demo build.
