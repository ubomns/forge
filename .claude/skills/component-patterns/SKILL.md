---
name: component-patterns
description: Frontend component and state-management conventions — composition, prop contracts, state, and accessibility patterns. Use before implementing UI.
---

## Principles
- Verify the framework and libraries in package.json before importing.
- Single responsibility per component; lift state only as far as needed.
- Controlled inputs; explicit prop contracts (no implicit any).
- Handle every state from the design spec: loading, empty, error, success.
- Co-locate component, styles, and test.
- Prefer existing primitives over new ones; match current file structure.

## State
- Local UI state stays local; shared state via the project's store.
- Isolate side effects; clean up subscriptions and timers.

## Accessibility
- Semantic elements first; ARIA only to fill gaps.
- Keyboard handlers for any custom interactive element.

## Don'ts
- Don't invent hooks, props, or import paths — confirm they exist.
- Don't duplicate design tokens as literals.
