# Persona: Domain Expert

**Representative user:** Dr. Maria Santos, Materials Scientist  
**Organisation:** Research institute working on circular economy and material flows  
**Role in the system:** `domain-expert`

---

## Background

Dr. Santos holds a PhD in polymer chemistry. She has 12 years of experience characterising recycled plastics and assessing their suitability for industrial reuse. She is the institute's go-to expert for material properties, recycling rates, and hazard classification.

She is comfortable with Excel and specialised materials databases. She has used ECOINVENT and Granta MaterialsUniverse. She has heard of RDF and linked data but has never worked with a SPARQL endpoint or a shape constraint language.

---

## Goals

1. Quickly update factual properties (recycling rates, hazard classes, lifecycle phases) based on new measurement data or supplier reports
2. Flag data quality issues she notices while browsing records
3. Submit proposed changes to the curator for approval without needing to understand the underlying graph structure
4. See the status of her submissions so she knows whether her changes are live

---

## Frustrations

- "Technical systems require me to know the graph structure, but I just want to update a number."
- "I submitted changes weeks ago and have no idea whether they were accepted."
- "I accidentally broke a record once because I edited the wrong field. No one noticed for a month."
- "Error messages say 'Validation failed: sh:datatype mismatch' – I don't know what that means."
- "I have to remember which fields I'm allowed to edit and which ones I'll get in trouble for touching."

---

## Tasks (in the system)

1. Browse the record list to find materials in her area of expertise
2. Open a record and update factual fields (recycling rate, hazard class, notes)
3. Save as draft while she waits for a cited study to confirm a value
4. Submit the record for review once confident
5. Check the dashboard to see whether her submissions were approved or rejected
6. If rejected, read the curator's reason and correct the issues

---

## UX needs

| Need | Design implication |
|------|--------------------|
| Understand immediately which fields she can edit | Lock icon + tooltip on read-only fields (Nielsen H6) |
| Immediate feedback that her input is valid | Inline validation on blur (Nielsen H5) |
| Clear error messages with actionable suggestions | Specific error text + suggestion string (Nielsen H9) |
| Know her changes are not lost | Draft saving + "Unsaved changes" indicator (Nielsen H1, H3) |
| Not fear accidentally breaking approved data | Pending changes staged separately; only curator can merge (H5) |
| Understand the review lifecycle | Status badge visible everywhere; submission confirmation (H1) |
| Not be overwhelmed with graph jargon | Plain-language labels; technical details hidden by default (H2, H8) |

---

## Implications for design

- **Default view should be the editor, not a graph visualisation.** Maria thinks in tables and forms, not RDF triples.
- **Lock explanations must say "You are acting as Domain Expert. This field requires Curator access." – not just show a padlock.**
- **Validation errors must name the field, state what's wrong, and suggest a fix.** "Enter a value between 0 and 100." beats "Invalid input."
- **Draft saving is safety-critical.** Maria may spend 20 minutes on a record before deciding to submit. Losing that work would destroy trust.
- **The review submission should feel like handing off a document, not pushing to production.** Confirmation message should say "Submitted for review" – not "Commit pushed."
