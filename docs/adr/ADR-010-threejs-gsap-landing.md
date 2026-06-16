# ADR-010: three.js + GSAP for the Buyer-Facing Landing Hero

**Date:** 2026-06-15
**Status:** Accepted

## Context

The conversion playbook rebuilds the landing page to be buyer-facing. The
product owner has **locked** the use of **three.js** (WebGL 3D) and **GSAP**
(animation/scroll) for the new hero/landing visual experience. This is a
user-locked technology choice — the ADR does **not** evaluate whether to use
them; it designs *how* to integrate them safely into the existing stack.

Constraints that shape the integration:

- This repo is **Next.js 16.2.4 on the Pages Router** (not App Router). The
  relevant API for client-only loading is `next/dynamic` with `{ ssr: false }`,
  verified present in `node_modules/next/dynamic.d.ts`
  (`DynamicOptions.ssr?: boolean`). React 19 is the runtime.
- three.js + GSAP are **heavy**: three.js core is ~150 KB gzipped and GSAP core
  ~25 KB gzipped (figures to confirm at the pinned versions on install). The
  existing landing is light (framer-motion only). We must not regress
  first-load performance for visitors who never see the 3D layer.
- WebGL is not universally available (old devices, locked-down browsers,
  headless/SSR). The page must work without it.
- `prefers-reduced-motion` accessibility is **mandatory** (WCAG 2.3.3 / 2.2 AA
  posture in `accessibility-audit`).
- The existing design system is **bespoke CSS in `styles/globals.css`**
  (CSS-variable tokens, hand-written keyframes) plus framer-motion v12. three.js
  must coexist with — not replace — that system.

## Decision

Adopt three.js + GSAP **only for an isolated, lazy-loaded hero visual layer**,
fenced behind four guards: client-only load, capability detection, reduced-motion
fallback, and a strict performance budget.

**1. Client-only load (no SSR).** The 3D hero is a separate component
(`components/landing/HeroCanvas.tsx`, to be added) imported via
`next/dynamic(() => import(...), { ssr: false, loading: () => <HeroStatic /> })`.
three.js touches `window`/`document`/WebGL and must never run during SSR or
static generation. `ssr: false` guarantees the module is only fetched and
executed in the browser.

**2. Static-first markup is the source of truth.** The hero's text, headline,
sub-headline, and CTAs are rendered as ordinary server-rendered HTML/CSS
(`HeroStatic`). The WebGL canvas is a **decorative background layer** mounted
behind/around that markup. SEO, the LCP text, and all CTAs exist and are
clickable before — and whether or not — three.js ever loads. The 3D layer is
`aria-hidden` decorative.

**3. Capability + reduced-motion gating.** On mount the canvas component checks,
in order:
   - `window.matchMedia('(prefers-reduced-motion: reduce)').matches` → render the
     static hero only; **do not** load the 3D scene or start GSAP timelines.
   - WebGL availability (probe a `canvas.getContext('webgl2'||'webgl')`) → if
     absent, render the static hero only.
   - Optional coarse perf heuristic (e.g. `navigator.hardwareConcurrency` low,
     `navigator.connection.saveData`) → fall back to static.
   Only when all pass does the dynamic chunk initialise three.js + GSAP.

**4. Performance budget (gates the lazy chunk).**
   - **Initial route JS (no 3D):** the landing route must not grow the
     first-load shared bundle by more than ~10 KB gzipped vs. today
     (the dynamic import keeps three.js/GSAP out of the initial chunk).
   - **3D chunk budget:** three.js + GSAP + scene code ≤ **~200 KB gzipped**,
     loaded only after the static hero paints and only when guards pass.
   - **Runtime:** target sustained 60 fps on a mid-tier laptop; cap
     `devicePixelRatio` (e.g. `Math.min(window.devicePixelRatio, 2)`); pause the
     render loop when the canvas is off-screen (IntersectionObserver) and on
     `visibilitychange`; dispose geometries/materials/renderer on unmount.
   - **Import surface:** import GSAP and three.js submodules narrowly
     (e.g. `gsap` core + only the plugins used; avoid `three/examples` wholesale)
     to keep the chunk near budget. Confirm tree-shaking against the build report.

**5. Coexistence with the bespoke CSS design system.** The canvas is positioned
with existing `styles/globals.css` tokens (the same color variables drive the
3D material palette so the WebGL layer matches the brand). framer-motion
continues to drive DOM text/CTA entrance animation; GSAP is scoped to the WebGL
scene and any scroll-linked canvas behaviour, so the two animation systems do
not fight over the same DOM nodes. No `tailwind.config.*` change (Tailwind v4
config lives in CSS, per project convention).

**6. Graceful degradation summary.** SSR → static. No WebGL → static. Reduced
motion → static. Chunk load failure → `loading`/error boundary keeps the static
hero. In every fallback the page is fully functional and on-brand.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| three.js + GSAP, lazy + guarded (chosen) | Honours locked choice; zero SSR risk; no first-load regression; accessible fallback | Adds a heavy optional chunk; two animation systems to keep scoped |
| three.js eagerly imported in `Landing.tsx` | Simpler code | Breaks SSR (window access); inflates first-load bundle; fails reduced-motion/WebGL users | 
| react-three-fiber wrapper | Declarative scene; React-friendly | Extra dependency + its own version coupling to React 19; not requested; more bundle | 
| CSS/framer-motion-only hero (no three.js) | Lightest; already in stack | **Rejected — contradicts the locked G1 technology choice** |
| Pre-rendered video/Lottie instead of live WebGL | Cheap, predictable perf | Not the locked choice; large media payloads; less interactive |

## Consequences

**Positive:**
- The locked visual ambition ships without harming SSR, SEO, first-load
  performance, or accessibility.
- Visitors on weak devices / reduced-motion / no-WebGL still get a clean,
  on-brand, fully functional hero.
- three.js/GSAP are quarantined to one dynamically-imported component; the rest
  of the app and the existing animation system are untouched.

**Negative:**
- Two new heavy dependencies enter the project (see "to be added — verify on
  install"); ongoing bundle vigilance required (CI bundle-size check
  recommended).
- A second animation library (GSAP) alongside framer-motion — must be kept
  scoped to WebGL to avoid overlap/confusion.
- Added engineering surface: capability detection, render-loop lifecycle, and
  resource disposal must be implemented correctly to avoid memory/GPU leaks.

## Dependencies (to be added — verify on install)

| Package | Purpose | Status |
|---|---|---|
| `three` | WebGL 3D hero scene | To be added — verify on install; pin exact version once installed |
| `gsap` | Scene / scroll animation timelines | To be added — verify on install; pin exact version once installed |
| `@types/three` (dev) | TypeScript types for three.js | To be added — verify on install (GSAP ships its own types) |

> Do **not** assert versions until `package.json` records them. ATAM perf budget
> figures above are targets to validate against the actual installed builds.

## Requirement traceability

- PRD-conversion-playbook: landing rebuild (buyer-facing positioning); G1 locked
  technology choice (three.js + GSAP).
- Accessibility: `prefers-reduced-motion` mandatory (accessibility-audit skill).
- NFR (new) NFR-13 perf budget; NFR-14 reduced-motion + WebGL graceful
  degradation (see ARCHITECTURE §2.2 / §3).
- Coexistence with `styles/globals.css` design system (project convention).
