# Persona: Curator

**Representative user:** Jan Müller, Data Steward  
**Organisation:** Research institute working on circular economy and material flows  
**Role in the system:** `curator`

---

## Background

Jan has a background in information science and has been working as a data steward at the institute for 6 years. He is responsible for the quality, consistency, and completeness of the materials knowledge graph. He has working knowledge of linked data concepts and understands what provenance and confidence mean in a semantic data context, but he does not write SPARQL queries day-to-day.

He reviews 10–30 proposed changes per week from domain experts across three research groups. He also handles escalations (conflicting data, duplicate entries, fields with missing provenance).

---

## Goals

1. Efficiently review incoming change requests with enough context to make a confident decision
2. Understand what changed, who submitted it, and why (provenance trail)
3. Accept high-quality changes quickly; reject unclear or unsupported changes with actionable feedback
4. Maintain overall graph quality and consistency (e.g. hazard classes must be evidenced, not guessed)
5. Lock records that are under active investigation to prevent concurrent edits

---

## Frustrations

- "I receive a change request but cannot see what the old value was. I have no idea whether this is an improvement or a mistake."
- "Some submissions have no provenance note. I can't approve what I can't trace."
- "I need to write a rejection reason every time, but the system doesn't force submitters to acknowledge it."
- "When I approve 10 changes in a row, I have no confirmation that each one worked."
- "I sometimes lose my place in the review queue after a page reload."

---

## Tasks (in the system)

1. Open the review queue and see all pending submissions at a glance
2. Select a record and view the side-by-side diff (old value vs proposed value)
3. Read the audit trail to understand the context of the change
4. Approve changes that are well-supported, or reject with a specific written reason
5. Check provenance panel for source references
6. Lock a record temporarily while a conflict is being resolved
7. Unlock a record once the conflict is cleared

---

## UX needs

| Need | Design implication |
|------|--------------------|
| See what changed without reading the entire record | Side-by-side diff with changed fields highlighted (Nielsen H6) |
| Understand full change history | Audit trail panel per record (Nielsen H6) |
| Write rejection reasons that will actually help submitters | Required rejection form; displayed back to submitter (Nielsen H9) |
| Confirmation after each approve / reject action | "Decision recorded" status message (Nielsen H1) |
| Return to the queue easily after reviewing a record | Review queue stays visible in split-pane layout (Nielsen H3) |
| Lock records without breaking the approval flow | Lock/unlock available from record detail; locked records clearly marked (H4, H5) |
| Confidence that the system will flag data quality issues | Validation state visible in record list; flagged records surface in dashboard tasks (H1) |

---

## Implications for design

- **The diff panel is the core curator tool.** It must show every field that changed and clearly distinguish "unchanged" from "changed" rows (highlight color + indicator dot, not just color alone).
- **The rejection form must be mandatory when rejecting.** An empty rejection reason is useless to the submitter and wasted effort for the curator.
- **Audit trail must be one click away** from any review decision. Jan should not have to navigate away to understand the history.
- **Queue persistence matters.** After approving one record, Jan should be taken directly to the next. He should not have to re-navigate to the queue page.
- **Approve should be satisfying and clear.** "✓ Approved" with a green confirmation banner – not just silence. Status badge must update immediately (Nielsen H1).
- **Lock/unlock must be available without leaving the record detail.** Jan often decides to lock mid-review.
