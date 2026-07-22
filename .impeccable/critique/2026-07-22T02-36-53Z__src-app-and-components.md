---
target: whole hiy app (src/app and src/components)
total_score: 20
p0_count: 0
p1_count: 4
timestamp: 2026-07-22T02-36-53Z
slug: src-app-and-components
---
Method: dual-agent (A: /root/design_review · B: /root/detector_review)

# Hiy UI/UX Critique

## Design health

| Heuristic | Score / 4 | Finding |
|---|---:|---|
| Visibility of system status | 3 | Loading and completion states exist, but long ingestion and publication state are not always explicit. |
| Match with the real world | 3 | Creator language is approachable; citations and plan labels overstate what the system actually delivers. |
| User control and freedom | 2 | Source deletion exists, but there is no private review-to-publish gate, undo, or recovery path. |
| Consistency and standards | 2 | Marketing, pricing, settings, sharing, and database plan names disagree. |
| Error prevention | 1 | Automatic publication, destructive reindexing, and delete-without-confirmation create avoidable risk. |
| Recognition rather than recall | 2 | The dashboard is learnable, but icon-only mobile navigation and hidden sharing actions increase memory load. |
| Flexibility and efficiency | 1 | No bulk correction workflow, approval queue, recurring sync, or useful expert shortcuts. |
| Aesthetic and minimalist design | 3 | The visual system is polished, but familiar AI gradients, oversized serif display type, pills, and soft cards dilute distinctiveness. |
| Help users recover from errors | 2 | Inline failures exist, while missing twins and expired links end in a generic dead end. |
| Help and documentation | 1 | No onboarding checklist, privacy explanation, publishing guidance, or contextual help for high-risk actions. |
| **Total** | **20 / 40** | **Acceptable foundation, not launch-ready.** |

## Anti-pattern verdict

Borderline fail. The instant-twin builder, citation concept, restrained orb, and explicit “I don't know” behavior are ownable. The surrounding visual language relies heavily on current AI-product conventions: warm paper, pastel washes, editorial italic serif accents, rounded cards, pill controls, and diffuse shadows.

The static detector reported three font warnings, all caused by substring matching `Inter` inside `Instrument` and therefore treated as false positives. Browser inspection found credible accessibility and hierarchy issues instead: repeated 11px text, low-contrast secondary copy, all-caps microcopy used as body information, nested cards, large decorative shadows, and a flat default 404. The captured mobile homepage also clipped important hero content and should be reproduced across device widths.

## What works

- The homepage communicates the core interaction quickly through a live creation flow rather than abstract feature copy.
- The warm editorial art direction feels calmer and more personal than a typical enterprise AI dashboard.
- Refusal behavior and source attribution point toward a trustworthy product position.
- The dashboard's five functional areas form a reasonable creator mental model.
- Pricing hierarchy and primary calls to action are visually easy to scan.

## Priority issues

### P1 — Citations are not verifiable evidence

The interface promises trustworthy, linked answers, while the runtime usually exposes source titles rather than claim-level URLs, excerpts, or passages. Make citations open an exact supporting passage and visibly distinguish supported, inferred, and unsupported claims.

### P1 — Content becomes public before the creator has a trust checkpoint

The current flow publishes after ingestion. Add private preview, a readiness checklist, adversarial sample questions, and an explicit Publish action. Show the current visibility state persistently.

### P1 — Mobile navigation hides the product model

Six unlabeled icons force recall and reduce accessibility. Use labels, reduce the number of primary destinations, and move low-frequency settings out of the main navigation.

### P1 — Pricing presents an unavailable product

Four polished tiers imply a purchasable service, but there is no billing path and several advertised limits or features disagree with runtime behavior. Replace this with a truthful founder-beta offer until checkout, entitlements, quotas, and lifecycle states work end to end.

### P2 — Failure routes abandon the visitor

Missing twins and expired shares render a generic 404. Provide branded recovery with search, creator-home navigation, report/contact options, and a clear explanation.

## Cognitive load

Five of eight checks fail: weak chunking in dense dashboard states, too many simultaneous homepage and navigation choices, reliance on icon recall, insufficient progressive disclosure, and high-risk publishing decisions without staged confirmation. The most important simplification is to make the journey linear: import, review quality, publish, distribute, learn from gaps.

## Persona red flags

- A non-technical coach cannot confidently tell what is public, what the twin learned, or whether an answer is safe to share.
- A privacy-conscious consultant sees no clear retention, deletion, or consent explanation before uploading valuable content.
- A mobile visitor must interpret tiny secondary text and icon-only navigation, with key hero content at risk of clipping.
- An established creator cannot verify citations, manage stale knowledge, or connect conversations to measurable business outcomes.

## Overall recommendation

Preserve the calm editorial identity and instant creation moment. Redesign the product around creator control and proof: private-by-default setup, a citation-backed quality gate, explicit publishing, visible freshness, actionable unanswered-question feedback, and one commercially honest beta offer.
