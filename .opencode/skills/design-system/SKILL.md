---
name: design-system
description: The project's dark editorial design system — tokens for color, typography, spacing, and radius. Use for any UI spec or styling decision to keep visual consistency.
---

## Color tokens
- bg/base #0A0A0A | surface #141414 | surface-raised #1C1C1C
- text/primary #F5F5F5 | text/muted #A1A1A1
- accent/cyan #22D3EE | accent/cyan-dim #0E7490
- border #262626 | success #34D399 | warning #FBBF24 | error #F87171

## Typography
- Headlines: "Instrument Serif", serif — large, tight leading.
- Body: "Manrope", sans-serif — weights 400 / 500 / 700.
- Metadata / code / labels: "JetBrains Mono", monospace.
- Type scale (rem): 0.75, 0.875, 1, 1.25, 1.5, 2, 3.

## Spacing (4px base)
4, 8, 12, 16, 24, 32, 48, 64.

## Radius
sm 4px | md 8px | lg 16px | full 9999px.

## Rules
- Use tokens only. Never hardcode a raw hex/px that duplicates a token.
- A missing value is a PROPOSED new token — flag it, do not improvise.
- Preserve contrast ratios (see accessibility-audit).
