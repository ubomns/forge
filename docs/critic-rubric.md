# Critic Severity Rubric

This document defines what counts as each severity level for the Forge critic agent. The critic prompt references this rubric when assigning severity to critiques.

## High

Issues that could fundamentally undermine the plan's credibility with an investor.

- **Contradictions between sections.** E.g. the GTM says "enterprise direct sales" but the business model says "freemium with self-serve onboarding."
- **Missing critical information.** E.g. the financials section has no revenue projection, or the ask has no use-of-funds breakdown.
- **Undefensible market claims.** E.g. "TAM of $500B" with no source or methodology, or claiming "no competition" in a mature market.
- **Fundamental model incoherence.** E.g. the pricing doesn't match the target audience's willingness to pay, or the unit economics assume margins that the business model can't deliver.

## Medium

Substantive issues worth the founder's attention but not plan-breaking.

- **Questionable assumptions that need evidence.** E.g. "we'll capture 5% of the market in year one" without explaining how.
- **Vague sections that could be more specific.** E.g. the GTM says "social media marketing" without naming channels, budgets, or metrics.
- **Scope misalignment.** E.g. the product features target enterprise buyers but the market section only discusses SMB segments.
- **Weak competitive positioning.** E.g. claiming "first mover advantage" when well-funded competitors exist, or listing advantages that are table stakes not differentiators.
- **Financial gaps.** E.g. break-even timeline is mentioned but the key costs contributing to it are missing.

## Low

Style issues, minor preferences, and nits that don't affect the substance.

- **Minor wording preferences.** E.g. "leverage" vs "use", passive vs active voice.
- **Formatting inconsistencies.** E.g. one section uses sentence case for bullet points and another uses title case.
- **Small redundancies.** E.g. the same point made slightly differently in two sections.
- **Nit-level specificity suggestions.** E.g. "consider adding a timeline" on a section that's already adequate without one.
- **Opinion on tone.** E.g. "this could sound more confident" — this is a judgment call, not an objective issue.

## Design principle

The severity field **replaces** tone-of-voice instructions in the critic prompt. The critic should be sharp and direct — it identifies real problems. The UI layer handles the presentation: `high` and `medium` are shown by default; `low` is collapsed under a "+N nits" toggle. This separation means the critic never needs to be told to "be encouraging" or "be direct" — it just needs to categorize correctly.