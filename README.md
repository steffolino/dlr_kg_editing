# KG Editor – PoC

A low-barrier, role-based knowledge graph editing tool for domain experts, built as a proof-of-concept for a research-institute interview.

## What it demonstrates

- **Role-based editing** of a circularity / materials / supply-chain knowledge graph
- **Low-barrier UX** for domain experts who are not familiar with RDF, SPARQL, or SHACL
- All **10 Nielsen usability heuristics** explicitly implemented and documented
- SHACL-inspired constraint validation (client- and server-side) from plain JSON config
- Spreadsheet-like editor hybrid with grouped fields, inline validation, draft saving
- Review workflow: Domain Expert → submit → Curator approve/reject → audit trail

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Nuxt 3 (Nuxt 4 compatibility mode) + Vue 3 Composition API |
| Language | TypeScript (strict, no `any`) |
| Styling | Tailwind CSS + `@tailwindcss/forms` |
| State | `useState` (Nuxt) + `localStorage` for draft persistence |
| Backend | Nitro server routes + in-memory store (no database) |
| Data | Local JSON files (`data/`) loaded once on server start |

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open http://localhost:3000
```

The app auto-selects **Dr. Maria Santos (Domain Expert)** on first load.  
Use the **persona switcher** in the header to switch between roles.

## Demo scenarios

| # | Scenario | How to demo |
|---|----------|-------------|
| 1 | Domain expert edits a permitted field | Switch to Dr. Maria Santos → open MAT-003 → change Recycling Rate → Save draft |
| 2 | Domain expert tries to edit a locked field | Open any Material as Domain Expert → try editing "Allowed Lifecycle Phases" (locked icon appears with explanation) |
| 3 | Invalid input triggers inline validation | Open MAT-003 → enter `150` in Recycling Rate → click outside field → error appears |
| 4 | Submit for review | Edit MAT-003 as Domain Expert → Save draft → Submit for review |
| 5 | Curator reviews changes | Switch to Jan Müller (Curator) → open Review queue → review MAT-002 or SUP-001 → approve or reject |
| 6 | Admin inspects shape constraints | Switch to Dr. Priya Patel (Ontology Engineer) → open Shape inspector |

## Project structure

```
├── app.vue                        # Root layout shell
├── nuxt.config.ts
├── tailwind.config.ts
├── types/index.ts                 # All shared TypeScript types
│
├── data/                          # Static JSON data (loaded by server)
│   ├── entities.json              # 10 example entities across 5 types
│   ├── shapes.json                # SHACL-inspired field constraint config
│   ├── users.json                 # 4 demo users / personas
│   ├── permissions.json           # Per-role permission flags
│   ├── relations.json             # KG edges between entities
│   └── audit-log.json            # Historical audit entries
│
├── server/
│   ├── utils/store.ts             # In-memory store + server-side validation
│   └── api/
│       ├── entities.get.ts        # GET /api/entities?type=&status=&q=
│       ├── entities/[id].get.ts   # GET /api/entities/:id
│       ├── entities/[id].patch.ts # PATCH /api/entities/:id
│       ├── entities/[id].lock.post.ts
│       ├── review/submit.post.ts  # POST /api/review/submit
│       ├── review/decision.post.ts# POST /api/review/decision
│       ├── shapes.get.ts          # GET /api/shapes
│       └── users.get.ts           # GET /api/users
│
├── composables/
│   ├── useAuth.ts                 # Current user + role switching
│   ├── useValidation.ts           # Client-side field validation
│   └── usePermissions.ts         # Role-based permission checks
│
├── components/
│   ├── layout/
│   │   ├── AppHeader.vue          # Top nav + role switcher
│   │   └── StatusBadge.vue        # Reusable status chip
│   ├── editor/
│   │   ├── RecordEditor.vue       # Main editing form
│   │   ├── FieldRenderer.vue      # Single field (all datatypes)
│   │   └── ValidationSummary.vue  # Error list with field links
│   └── review/
│       └── ReviewDiffPanel.vue    # Old vs new value comparison
│
├── pages/
│   ├── index.vue                  # Dashboard
│   ├── entities/
│   │   ├── index.vue              # Record list with filters
│   │   └── [id].vue               # Record detail editor
│   ├── review/index.vue           # Review queue
│   └── admin/shapes.vue           # Shape / constraint inspector
│
└── docs/
    ├── heuristics-mapping.md
    ├── architecture.md
    └── personas/
        ├── domain-expert.md
        └── curator.md
```

## Roles

| Role | Can edit fields | Can submit | Can review | Can lock | Can edit shapes |
|------|----------------|------------|------------|----------|----------------|
| Domain Expert | Permitted fields only | ✓ | ✗ | ✗ | ✗ |
| Curator | All fields | ✓ | ✓ | ✓ | ✗ |
| Ontology Engineer | All fields | ✓ | ✓ | ✓ | ✓ |

## Key design decisions

- **No database** – all state lives in a Nitro module-level Map. Resets on server restart (intentional for a PoC/demo).
- **No full SHACL** – constraints are defined in `data/shapes.json` as plain JSON and interpreted by `useValidation` and `server/utils/store.ts`.
- **Draft persistence** – `localStorage` is used to keep unsaved edits across page refreshes within a browser session.
- **Double validation** – client-side composable + server-side API route guard both validate against the same shape rules.

## Linting

```bash
npm run lint
```
