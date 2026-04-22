# Architecture Overview

## Purpose

This document describes the technical architecture of the KG Editor PoC, a low-barrier knowledge graph editing tool for domain experts.

---

## High-level diagram

```
Browser                     Nitro (server)
──────────────────          ─────────────────────────────────
pages/          ──fetch──▶  server/api/entities.get.ts
components/     ◀──JSON──   server/api/entities/[id].get.ts
composables/    ──PATCH──▶  server/api/entities/[id].patch.ts
                ──POST───▶  server/api/review/submit.post.ts
                ──POST───▶  server/api/review/decision.post.ts
                            server/utils/store.ts  (in-memory Map)
                                 ▲
                            data/*.json  (initial seed)
```

---

## Layer responsibilities

### `types/index.ts`
Single source of truth for all TypeScript interfaces shared between client and server. No `any` types.

### `data/*.json`
Static seed files loaded once at server start:

| File | Content |
|------|---------|
| `entities.json` | 10 demo entities across 5 entity types |
| `shapes.json` | SHACL-inspired field constraint config |
| `users.json` | 4 demo users with roles |
| `permissions.json` | Per-role capability flags |
| `relations.json` | KG edges (used for provenance display) |
| `audit-log.json` | Seed audit history |

### `server/utils/store.ts`
Module-level Maps and arrays that act as an in-memory database.  
Initialised from JSON on first import. State persists within a single Nitro process (resets on restart – acceptable for a PoC).

Also contains `validateFields()` – server-side field validation that mirrors the client-side composable (defence-in-depth against bypassed client validation).

### `server/api/`
H3-compliant REST-style endpoints. All return `{ data: T }` or throw `createError`.  
Server validates all write operations independently of the client.

### `composables/useAuth.ts`
Wraps `useState('currentUser')` – a Nuxt shared state that survives navigation.  
Provides `setUser()` for the persona switcher.

### `composables/usePermissions.ts`
Role-to-capability logic. The key function `canEditField(fieldShape)` returns `{ editable, reason }` – a boolean plus a human-readable explanation for locked fields (Nielsen H6 / H9).

### `composables/useValidation.ts`
Client-side field validation against shape constraints.  
- `validateField()` – called on blur for immediate feedback
- `validateAll()` – called on submit; returns false if any errors remain
- `errors` – reactive `Record<fieldKey, ValidationError>` consumed by `ValidationSummary` and `FieldRenderer`

### `components/editor/`

| Component | Role |
|-----------|------|
| `FieldRenderer.vue` | Renders one field in edit or read-only mode based on datatype + role permission |
| `RecordEditor.vue` | Assembles field groups, drives validation, handles save-draft / submit workflow |
| `ValidationSummary.vue` | Error list with clickable links to each offending field |

### `components/review/ReviewDiffPanel.vue`
Computes a diff between `entity.fields` (approved values) and `entity.pendingChanges`.  
Shows approve / reject controls with rejection-reason form.

### `components/layout/`

| Component | Role |
|-----------|------|
| `AppHeader.vue` | Sticky top nav + role switcher |
| `StatusBadge.vue` | Reusable status chip with consistent color mapping |

### `pages/`

| Page | Purpose |
|------|---------|
| `index.vue` | Dashboard: summary cards, open tasks, records list, glossary |
| `entities/index.vue` | Record list with server-side filtering |
| `entities/[id].vue` | Record detail editor with breadcrumb and lock controls |
| `review/index.vue` | Review queue split-pane: queue list + diff panel |
| `admin/shapes.vue` | Shape / constraint inspector |

---

## Review workflow state machine

```
        ┌─────────────────┐
        │      draft       │◀─────────────────────────┐
        └────────┬─────────┘                          │ reject
                 │ submit (domain-expert)              │
                 ▼                                     │
      ┌──────────────────────┐              ┌──────────────────┐
      │    pending-review     │──approve──▶ │    approved      │
      └──────────────────────┘              └──────────────────┘
                                                      │
                                             lock (curator) │
                                                      ▼
                                            ┌──────────────────┐
                                            │      locked      │
                                            └──────────────────┘
                                             unlock (curator) │
                                                      │
                                                      ▼
                                                 approved
```

---

## Validation flow

```
User edits field
      │
      ▼
  onBlur() → validateField() [client]
      │
      ▼
  Inline error shown (FieldRenderer)
      │
User clicks "Save draft"
      │
      ▼
  validateAll() [client] → false?
  → show ValidationSummary, focus first error
      │
      ▼ valid
  PATCH /api/entities/:id [server]
      │
      ▼
  validateFields() [server-side]
      │ invalid
      ▼
  HTTP 422 + errors map → shown as server error banner
      │ valid
      ▼
  Entity updated in store → 200 response
```

---

## Data model summary

### Entity
```
{
  id, type, label, status, ownerRole,
  provenanceSource, lastReviewedAt, createdAt, lockedBy,
  fields: Record<string, FieldValue>,
  pendingChanges: Record<string, FieldValue> | null,
  reviewNotes: string | null
}
```

`fields` holds current approved values.  
`pendingChanges` holds staged edits from a domain expert, awaiting curator review.  
On approve: `fields = merge(fields, pendingChanges)`, `pendingChanges = null`.  
On reject: `pendingChanges = null`, `reviewNotes = reason`.

### FieldShape (in shapes.json)
```
{
  key, label, datatype, required,
  editableByRoles, allowedValues?, min?, max?,
  helpText, group, defaultValue?
}
```

This is the SHACL-inspired config that drives both UI rendering and validation.

---

## SHACL alignment notes

The shape config is intentionally a simplified subset of SHACL concepts:

| SHACL concept | PoC equivalent |
|---------------|----------------|
| `sh:targetClass` | `entityType` field on shape |
| `sh:property` | each entry in `fields[]` |
| `sh:datatype` | `datatype` field |
| `sh:in` | `allowedValues` array |
| `sh:minInclusive` / `sh:maxInclusive` | `min` / `max` fields |
| `sh:minCount 1` | `required: true` |
| (custom) | `editableByRoles` – role-based write access |

A real implementation would parse SHACL shapes graphs from a triplestore; here the JSON is a human-readable stand-in that achieves the same UX goals.
