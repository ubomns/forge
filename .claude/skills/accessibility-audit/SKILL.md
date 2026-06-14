---
name: accessibility-audit
description: WCAG 2.2 AA checklist for auditing UI designs and implementations. Use when specifying or reviewing any interface.
---

## Checklist (WCAG 2.2 AA)
- [ ] Text contrast >= 4.5:1 (>= 3:1 for large text and UI components)
- [ ] All interactive elements reachable and operable by keyboard
- [ ] Visible focus indicator on every focusable element
- [ ] Logical focus order; no keyboard traps
- [ ] Images have alt text; decorative images use empty alt
- [ ] Form inputs have associated labels; errors are announced
- [ ] Semantic HTML / correct ARIA roles; no redundant ARIA
- [ ] Target size >= 24x24 CSS px
- [ ] Motion respects prefers-reduced-motion
- [ ] Usable at 200% zoom; reflows at 320px width

## Rules
- State which criteria PASS — never claim "accessible" wholesale.
- Flag any criterion you could not verify.
