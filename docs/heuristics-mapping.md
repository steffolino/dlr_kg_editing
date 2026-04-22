# Nielsen Usability Heuristics – Implementation Mapping

This document traces all 10 Nielsen Usability Heuristics to specific UI decisions and code locations in the KG Editor PoC.

---

## H1 · Visibility of System Status

> Always keep users informed about what is going on, through appropriate feedback within reasonable time.

| Where | How |
|-------|-----|
| `AppHeader.vue` | Role badge always visible; updates immediately on persona switch |
| `RecordEditor.vue` – action bar | Save state machine: Idle → Saving (spinner) → Saved (✓ with green text) → Error. Never silent. |
| `RecordEditor.vue` – action bar | "Unsaved changes" label appears as soon as a field is edited |
| `StatusBadge.vue` | Status chip on every record: Draft / Pending review / Approved / Rejected / Locked – present on list, detail, and review pages |
| `pages/index.vue` | Summary cards show counts per status at a glance |
| `pages/review/index.vue` | Queue size always shown in header |
| `ReviewDiffPanel.vue` | Decision state: idle → processing → done. "Decision recorded" confirmation. |
| `nuxt.config.ts` | Page transitions signal navigation in progress |

---

## H2 · Match Between System and the Real World

> Use words, phrases, and concepts familiar to the user, rather than system-oriented terms.

| Where | How |
|-------|-----|
| All UI labels | Domain language used throughout: "Recycling Rate", "Hazard Classification", "Provenance Source" – never RDF predicates like `skos:broader` or `sh:datatype` |
| `data/shapes.json` – `label` field | Each field has a human-readable label distinct from its technical `key` |
| `pages/admin/shapes.vue` | Datatypes rendered as plain English: "Single choice", "Multiple choice", "Long text" – not `xsd:string` etc. |
| `pages/index.vue` – glossary | Jargon (Entity, Provenance, Constraint) explained on the dashboard |
| `data/shapes.json` – `helpText` | Every field has a sentence explaining its meaning in domain terms |
| Status labels | "Pending review" not "IN_REVIEW_STATE"; "Approved" not "VALIDATED_TRUE" |

---

## H3 · User Control and Freedom

> Support undo and redo. Provide clearly marked "emergency exit" for unwanted actions.

| Where | How |
|-------|-----|
| `RecordEditor.vue` | "Discard changes" button reverts all edits to last saved state |
| `RecordEditor.vue` | Per-field ↺ reset button restores individual field to its saved value |
| `RecordEditor.vue` | `localStorage` draft saving so browser refresh does not lose work |
| `ReviewDiffPanel.vue` – reject flow | "Cancel" button in rejection form dismisses it without submitting |
| Breadcrumb on `pages/entities/[id].vue` | Always provides a path back to the list |
| `pages/entities/index.vue` | Individual filter chips can be removed one at a time, or all cleared at once |
| Record detail | Back navigation via breadcrumb, never a hard redirect trap |

---

## H4 · Consistency and Standards

> Users should not have to wonder whether different words, situations, or actions mean the same thing.

| Where | How |
|-------|-----|
| `StatusBadge.vue` | Single shared component ensures identical color/label for each status everywhere |
| `AppHeader.vue` | Navigation items always in the same order and position |
| Button placement | Primary action (Save / Submit / Approve) always at the right end of the action bar; Cancel/Discard always to its left |
| Role badge colors | Sky = Domain Expert, Amber = Curator, Violet = Ontology Engineer – consistent across header, review panel, shape inspector |
| `composables/useValidation.ts` | All error messages follow the same pattern: field label + issue + suggestion |
| All pages | Same page-title pattern: "Label · KG Editor" |

---

## H5 · Error Prevention

> Careful design prevents problems from occurring in the first place.

| Where | How |
|-------|-----|
| `FieldRenderer.vue` – select | Categorical fields use `<select>` / checkboxes, not free text, eliminating typos |
| `FieldRenderer.vue` – number | `<input type="number">` with `min` and `max` attributes constrains the range |
| `FieldRenderer.vue` – date | `<input type="date">` prevents invalid date strings |
| `data/shapes.json` – `helpText` | Inline hint shown **before** the user makes an error |
| `data/shapes.json` – `defaultValue` | Safe defaults (e.g. unit = "kg") reduce empty required fields |
| `RecordEditor.vue` | Client-side validation on blur catches errors before submit |
| `RecordEditor.vue` | Submit button disabled when record is already in `pending-review` |
| `ReviewDiffPanel.vue` | Reject button opens a form; submission is disabled until a reason is entered |
| `server/api/entities/[id].patch.ts` | Server-side validation mirrors client rules – defence against bypassed client |
| Lock/unlock | Destructive structural changes (locking a record) require curator role – not available to domain experts |

---

## H6 · Recognition Rather Than Recall

> Minimise the user's memory load. Make actions, options, and objects visible.

| Where | How |
|-------|-----|
| `FieldRenderer.vue` – lock tooltip | When a field is read-only, a lock icon and hover tooltip explain exactly WHY (e.g. "Only editable by Curators") |
| `FieldRenderer.vue` – select | All allowed values visible in the dropdown; no need to remember valid options |
| `FieldRenderer.vue` – multiselect | All options shown as checkboxes with current selection visible at a glance |
| `AppHeader.vue` | Current role badge always present – users never need to remember which persona they are acting as |
| `pages/index.vue` | "Your open tasks" section surfaces what the current role is expected to do |
| `pages/admin/shapes.vue` | All constraints (allowed values, min/max, required, editable roles) visible in the shape inspector table |
| `RecordEditor.vue` – pending notice | If the record has staged changes, a banner lists which fields changed |

---

## H7 · Flexibility and Efficiency of Use

> Provide accelerators to speed up interaction for expert users.

| Where | How |
|-------|-----|
| `pages/index.vue` – role switcher | Persona quick-toggle buttons for fast switching during demos |
| `pages/entities/index.vue` | Filters by type, status, and role; search by label/id; URL-synced so filters are shareable/bookmarkable |
| `AppHeader.vue` | Role select reachable from any page |
| Keyboard support | All interactive elements are native HTML controls – full keyboard navigation without custom JS; tab order follows logical reading order |
| `pages/review/index.vue` | URL param `?entity=ID` opens a specific record directly for deep-linking |
| `RecordEditor.vue` | "Save draft" shortcut available at all times; no need to scroll to submit |
| `pages/entities/index.vue` | Direct "Review" link on pending-review rows – no need to go through the record detail |

---

## H8 · Aesthetic and Minimalist Design

> Every extra unit of information competes with the relevant information. Remove irrelevant content.

| Where | How |
|-------|-----|
| `RecordEditor.vue` | Provenance panel collapsed by default – visible on demand via chevron toggle |
| `ReviewDiffPanel.vue` | Audit trail collapsed by default |
| `pages/admin/shapes.vue` | Each entity type collapsed; only one expanded by default |
| `tailwind.config.ts` | Restrained color palette – slate/white base, single indigo accent, status colors only where needed |
| All pages | No decorative images, gradients, or shadows beyond subtle card borders |
| `FieldRenderer.vue` | Lock tooltip hidden until hover/focus – not permanently visible to avoid noise |
| `pages/index.vue` | Glossary collapsed by default |

---

## H9 · Help Users Recognise, Diagnose, and Recover from Errors

> Error messages should be expressed in plain language, precisely indicate the problem, and constructively suggest a solution.

| Where | How |
|-------|-----|
| `FieldRenderer.vue` | Inline error per field: icon + bold message + italic actionable suggestion |
| `ValidationSummary.vue` | All errors collected at top of form; each item is a link that scrolls to and focuses the offending field |
| `RecordEditor.vue` | On submit failure, first invalid field is focused programmatically |
| `RecordEditor.vue` | Server error displayed with "Dismiss" option – not silently swallowed |
| `RecordEditor.vue` | Rejection note shown prominently at top of editor with "Address the issues below and re-submit" instruction |
| `ReviewDiffPanel.vue` | Require rejection reason – ensures submitter receives actionable feedback |
| `composables/useValidation.ts` | Every validation rule returns a `suggestion` string: "Enter a value between 0 and 100." |
| `server/api/review/decision.post.ts` | 422 returned if reason missing on rejection |
| Error messages | Language is specific: "Recycling Rate must be at most 100" – not "Invalid value" |

---

## H10 · Help and Documentation

> Even though it is better if the system can be used without documentation, it may be necessary to provide help.

| Where | How |
|-------|-----|
| `pages/index.vue` – glossary | In-page expandable glossary defining: Entity, Provenance, Review, Constraint, Pending changes, Draft, Confidence |
| `data/shapes.json` – `helpText` | Every field has a `helpText` shown as an inline hint in the editor (before errors, not only after) |
| `pages/admin/shapes.vue` | Shape inspector documents all constraints, datatypes, and role permissions in a readable table |
| `FieldRenderer.vue` | Lock tooltip doubles as documentation: explains the role-permission system in plain language |
| `docs/personas/` | Written personas document user goals, frustrations, and UX needs |
| `docs/architecture.md` | Technical overview for engineers onboarding to the codebase |
| `README.md` | Demo scenarios table shows exactly which steps to follow for each use case |
