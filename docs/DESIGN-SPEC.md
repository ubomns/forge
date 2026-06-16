# Forge — SaaS Pivot Design Specification

**Status:** Approved for implementation  
**Date:** 2026-06-11  
**Author:** UX Designer  
**Scope:** All new user-facing elements introduced by the SaaS pivot (auth, monetization, persistence, marketing).  
**Baseline:** `docs/PRD-saas-pivot.md`, `docs/ARCHITECTURE.md`, `docs/WBS.md`  

---

## 0. Design System Baseline

### 0.1 Tokens (from `styles/globals.css`)

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#000000` | Page canvas |
| `--surface` | `#181818` | Deepest container |
| `--surface-2` | `#202020` | Elevated card |
| `--border` | `#2a2a2a` | Hairline divider |
| `--border-strong` | `#494949` | Stronger divider |
| `--text` | `#ffffff` | Primary text |
| `--text-2` | `#969696` | Secondary text |
| `--text-3` | `#7d7d7d` | Muted / metadata |
| `--accent` | `#ffc000` | Lamborghini Gold — primary accent |
| `--accent-hover` | `#917300` | Dark gold — pressed/hover |
| `--accent-text` | `#ffce3e` | Gold text — inline highlight |
| `--accent-bg` | `rgba(255, 192, 0, 0.08)` | Subtle gold background |
| `--accent-border` | `rgba(255, 192, 0, 0.4)` | Gold border |
| `--cyan-pulse` | `#29abe2` | Informational accent |
| `--f-display` | `Anton, Bebas Neue, Helvetica Neue Condensed, sans-serif` | Display / headings (uppercase) |
| `--f-ui` | `Inter, Helvetica Neue, Arial, sans-serif` | UI / body (mixed case) |
| `--f-prose` | `Inter, Helvetica Neue, Arial, sans-serif` | Prose / paragraphs |
| `--ease-spring` | `cubic-bezier(0.16, 1, 0.3, 1)` | Primary motion easing |
| `--ease-out` | `cubic-bezier(0.0, 0, 0.2, 1)` | Exit / subtle motion |

### 0.2 Global constraints

- **Border radius:** `0` (sharp corners) for all components. The Lamborghini override block in `globals.css` forces `border-radius: 0 !important` on all listed classes. Any new component classes must be added to that override list or inherit from existing classes.
- **Typography:** All headings and display text use `var(--f-display)`, `text-transform: uppercase`, `font-weight: 400`, `letter-spacing: 0.02em–0.24em`. Body text uses `var(--f-ui)`, mixed case.
- **Hover feedback:** Color and border transitions only. No `transform: translateY()` or `scale` on hover (overridden by Lamborghini block).
- **Focus visible:** `outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 0 !important;` for keyboard focus. Inputs get `border-color: var(--accent)` + `box-shadow: 0 0 0 2px rgba(255, 192, 0, 0.2)`.
- **Motion:** `prefers-reduced-motion: reduce` must zero out all animations (see existing `@media` block in `globals.css`).
- **Touch targets:** Minimum `44×44px` on mobile.

### 0.3 Proposed new tokens

| Token | Value | Rationale |
|---|---|---|
| `--pro-badge-bg` | `rgba(255, 192, 0, 0.15)` | Pro/Team badge background — slightly more opaque than `--accent-bg` to ensure visibility on `--surface` |
| `--pro-badge-border` | `rgba(255, 192, 0, 0.6)` | Pro badge border — stronger than `--accent-border` |
| `--modal-backdrop` | `rgba(0, 0, 0, 0.72)` | Modal overlay backdrop — dark enough to isolate content without obscuring context |
| `--error-text` | `#ff6b6b` | Inline validation error text — distinct from gold accent, accessible on dark backgrounds |
| `--error-border` | `rgba(255, 107, 107, 0.5)` | Error input border — pairs with `--error-text` |

---

## 1. Email Capture Modal

**WBS ID:** SaaS-1.9  
**Trigger:** Anonymous user clicks "Download .docx" or "Download .pdf" in `done` state.  
**Purpose:** Capture lead email before delivering high-value export. Mandatory gate.  

### 1.1 User flow

Plan reaches `done` → User clicks Download → UI detects no auth cookie → **Email Capture Modal opens** → User enters email → Inline validation → Submit → POST `/api/leads` → Success → Modal closes → Download proceeds automatically.  

**Error exit:** Invalid email format → inline error message. Network error → inline error + retry.  

### 1.2 Layout

```
┌─────────────────────────────────────────┐
│  BACKDROP (fixed, full viewport)        │
│  background: var(--modal-backdrop)      │
│  backdrop-filter: blur(8px)             │
│                                         │
│     ┌─────────────────────────────┐     │
│     │  MODAL CARD                 │     │
│     │  background: var(--surface) │     │
│     │  border: 1px solid var(--border-strong) │
│     │  max-width: 420px           │     │
│     │  width: 100%                  │     │
│     │                             │     │
│     │  [×] Close (top-right)      │     │
│     │                             │     │
│     │  HEADLINE                   │     │
│     │  "ENTER YOUR EMAIL TO        │     │
│     │   DOWNLOAD"                 │     │
│     │                             │     │
│     │  Subtext                    │     │
│     │  "We'll send you a link to  │     │
│     │   edit this plan later."    │     │
│     │                             │     │
│     │  ┌─────────────────────┐    │     │
│     │  │ Email input         │    │     │
│     │  └─────────────────────┘    │     │
│     │  [Error message inline]     │     │
│     │                             │     │
│     │  ┌─────────────────────┐    │     │
│     │  │ SUBMIT →            │    │     │
│     │  └─────────────────────┘    │     │
│     │                             │     │
│     │  "No spam. Unsubscribe    │     │
│     │   anytime."              │     │
│     │                             │     │
│     └─────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

### 1.3 Component hierarchy

- `EmailCaptureModal` (portal / fixed overlay)
  - `Backdrop`
  - `ModalCard` (motion.div)
    - `CloseButton` (icon-only, top-right)
    - `Headline` (h2, display font)
    - `Subtext` (p, UI font)
    - `EmailForm`
      - `EmailInput` (controlled input)
      - `ErrorMessage` (conditionally rendered)
      - `SubmitButton` (primary CTA)
    - `TrustLine` (small muted text)

### 1.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| Backdrop | `opacity: 0` | — | — | — | — | — | — | — |
| ModalCard | `opacity: 0; scale: 0.96` | — | — | — | — | — | — | — |
| EmailInput | `border: var(--border-strong)` | — | `border: var(--accent); box-shadow: 0 0 0 2px rgba(255,192,0,0.2)` | — | — | placeholder visible | `border: var(--error-border); color: var(--error-text)` | — |
| SubmitButton | `bg: var(--accent); color: #000` | `bg: var(--accent-hover)` | `outline: 2px solid var(--accent)` | `bg: var(--accent-hover)` | spinner icon + `opacity: 0.7` | — | — | `opacity: 0.3; cursor: default` |
| CloseButton | `color: var(--text-3)` | `color: var(--text)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| ErrorMessage | hidden | — | — | — | — | — | visible | — |

**Form-level states:**
- **Empty:** Input is empty, submit button is disabled.
- **Validating:** Input loses focus, email format checked (contains `@` and domain). Invalid → Error state.
- **Submitting:** Button shows loading spinner, input disabled, button disabled.
- **Success:** Modal animates out, download proceeds.
- **Error (network):** Inline error text: "Something went wrong. Please try again."

### 1.5 Motion spec

| Element | Trigger | Property | From | To | Duration | Easing |
|---|---|---|---|---|---|---|
| Backdrop | mount | opacity | 0 | 1 | 200ms | ease-out |
| ModalCard | mount | opacity + scale | 0 / 0.96 | 1 / 1 | 250ms | var(--ease-spring) |
| ModalCard | unmount | opacity + scale | 1 / 1 | 0 / 0.96 | 200ms | var(--ease-out) |
| ErrorMessage | appear | opacity + translateY | 0 / -4px | 1 / 0 | 150ms | ease-out |
| SubmitButton | loading | opacity | 1 | 0.7 | 150ms | linear |

**Framer-motion variants:**
```
backdrop: { hidden: { opacity: 0 }, visible: { opacity: 1 } }
card: { hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1 } }
```

### 1.6 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Modal card is `width: 100%; max-width: none; margin: 0; border-radius: 0;` positioned at bottom of viewport (sheet style). Padding: `2rem 1.5rem`. |
| ≥ 640px (desktop) | Centered card, `max-width: 420px`, `margin: auto`, `border: 1px solid var(--border-strong)`. |

### 1.7 Token usage

- `--bg`, `--surface`, `--border-strong`, `--text`, `--text-2`, `--text-3`, `--accent`, `--accent-hover`, `--modal-backdrop`, `--error-text`, `--error-border`.

### 1.8 Accessibility notes

- **Focus trap:** When modal opens, focus moves to the email input. `Tab` cycles through input → submit → close → input. `Shift+Tab` reverses.
- **Escape:** Pressing `Escape` closes the modal and returns focus to the trigger button (Download).
- **ARIA:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby="email-modal-title"`, `aria-describedby="email-modal-desc"`.
- **Screen reader:** Announce "Enter your email to download" when modal opens. Announce error messages when they appear.
- **WCAG:** 2.4.3 (focus order), 2.4.7 (focus visible), 1.4.3 (contrast — all text meets 4.5:1), 2.1.1 (keyboard operable).

### 1.9 Copy and content

- **Headline:** `Enter your email to download`
- **Subtext:** `We'll send you a link to edit this plan later.`
- **Input placeholder:** `your@email.com`
- **Submit button:** `Download →`
- **Trust line:** `No spam. Unsubscribe anytime.`
- **Error (invalid format):** `Please enter a valid email address.`
- **Error (network):** `Something went wrong. Please try again.`
- **Close button aria-label:** `Close email dialog`

### 1.10 Open questions

- [Q5] Is email verification required before download, or is capture sufficient? (Affects copy — "verify your email" vs "enter your email".)

---

## 2. Auth Modal (Signup / Login)

**WBS ID:** SaaS-1.3, SaaS-2.10  
**Trigger:** "Log in / Sign up" in Nav; "Save your plan" banner CTA; free-account prompt CTA; post-email-capture upsell.  
**Purpose:** Authenticate user for plan persistence and tiered access.  

### 2.1 User flow

User clicks auth trigger → **Auth Modal opens** → Default tab: "Sign up" (if triggered by save/upsell) or "Log in" (if triggered by Nav) → User fills form → Inline validation → Submit → POST `/api/auth/signup` or `/api/auth/login` → Success → Modal closes → Auth state updates → UI re-renders with tier-aware elements.  

**Error exit:** Invalid credentials → inline error. Network error → inline error. Password mismatch (signup) → inline error.  

### 2.2 Layout

```
┌─────────────────────────────────────────┐
│  BACKDROP (same as Email Capture)       │
│                                         │
│     ┌─────────────────────────────┐     │
│     │  MODAL CARD                 │     │
│     │  max-width: 440px           │     │
│     │                             │     │
│     │  [×] Close                  │     │
│     │                             │     │
│     │  ┌─────────┐ ┌─────────┐    │     │
│     │  │ LOG IN  │ │ SIGN UP │    │     │
│     │  └─────────┘ └─────────┘    │     │
│     │  (tab switcher)             │     │
│     │                             │     │
│     │  ─────────────────────────  │     │
│     │                             │     │
│     │  Email input                │     │
│     │  Password input             │     │
│     │  [Confirm password] (signup)│     │
│     │                             │     │
│     │  [Error message inline]     │     │
│     │                             │     │
│     │  ┌─────────────────────┐    │     │
│     │  │ PRIMARY CTA         │    │     │
│     │  └─────────────────────┘    │     │
│     │                             │     │
│     │  ─── or ───                 │     │
│     │                             │     │
│     │  [Continue with Google]     │     │
│     │                             │     │
│     │  [Forgot password?] (login) │     │
│     │                             │     │
│     └─────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

### 2.3 Component hierarchy

- `AuthModal` (portal)
  - `Backdrop`
  - `ModalCard`
    - `CloseButton`
    - `TabSwitcher` ("Log in" / "Sign up")
    - `AuthForm` (switches content based on active tab)
      - `EmailInput`
      - `PasswordInput` (with visibility toggle)
      - `ConfirmPasswordInput` (signup only)
      - `ErrorMessage`
      - `SubmitButton`
    - `Divider` ("or")
    - `GoogleOAuthButton`
    - `ForgotPasswordLink` (login only)

### 2.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| TabSwitcher — active tab | `border-bottom: 2px solid var(--accent); color: var(--text)` | — | — | — | — | — | — | — |
| TabSwitcher — inactive tab | `border-bottom: 2px solid transparent; color: var(--text-3)` | `color: var(--text-2)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| PasswordInput | same as EmailInput | — | same focus | — | — | placeholder | same error | — |
| PasswordToggle (eye icon) | `color: var(--text-3)` | `color: var(--text)` | — | — | — | — | — | — |
| GoogleOAuthButton | `bg: var(--surface-2); border: var(--border-strong); color: var(--text)` | `border-color: var(--accent-border); color: var(--accent)` | `outline: 2px solid var(--accent)` | — | — | — | — | `opacity: 0.5` |
| ForgotPasswordLink | `color: var(--text-3); text-decoration: underline` | `color: var(--accent)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |

**Form-level states:**
- **Empty:** All inputs empty. Submit disabled until email and password are non-empty.
- **Validating (signup):** Password < 8 chars → inline error "Password must be at least 8 characters." Confirm password mismatch → "Passwords do not match."
- **Submitting:** All inputs disabled, button shows spinner, button text changes to "Creating account..." / "Logging in..."
- **Success:** Modal closes, auth state updates, page re-renders.
- **Error (credentials):** "Invalid email or password." (login) / "Email already in use." (signup)
- **Error (network):** "Something went wrong. Please try again."

### 2.5 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| Backdrop | mount | opacity | 200ms | ease-out |
| ModalCard | mount | opacity + scale | 250ms | var(--ease-spring) |
| Tab content | tab switch | opacity + translateX | 200ms | var(--ease-spring) |
| ErrorMessage | appear | opacity + translateY | 150ms | ease-out |
| SubmitButton | loading | opacity | 150ms | linear |

**Tab switch animation:** Fade out current content (opacity 1→0, 100ms), then fade in new content (opacity 0→1, translateX 8px→0, 200ms). No layout shift.

### 2.6 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Full-width sheet at bottom of viewport, same as Email Capture Modal. Tab text size increases to `1rem` for touch. Inputs: `min-height: 48px`. |
| ≥ 640px (desktop) | Centered card, `max-width: 440px`. |

### 2.7 Token usage

All tokens from Email Capture Modal, plus `--surface-2` for Google button background.

### 2.8 Accessibility notes

- **Focus trap:** Same as Email Capture Modal. Focus moves to active tab on open.
- **Escape:** Closes modal, returns focus to trigger.
- **ARIA:** `role="dialog"`, `aria-modal="true"`, tabs have `role="tablist"` / `role="tab"` / `role="tabpanel"`.
- **Password visibility:** Toggle button has `aria-label="Show password"` / `aria-label="Hide password"`, `aria-pressed` toggles.
- **WCAG:** Same as Email Capture. Plus 3.3.1 (error identification), 3.3.3 (error suggestion).

### 2.9 Copy and content

**Signup tab:**
- **Headline:** `Create your free account`
- **Subtext:** `Save plans, edit later, and build your portfolio.`
- **Email placeholder:** `your@email.com`
- **Password placeholder:** `Password (min. 8 characters)`
- **Confirm password placeholder:** `Confirm password`
- **Submit:** `Create account →`
- **Google button:** `Continue with Google`
- **Password error:** `Password must be at least 8 characters.`
- **Match error:** `Passwords do not match.`

**Login tab:**
- **Headline:** `Log in to Forge`
- **Email placeholder:** `your@email.com`
- **Password placeholder:** `Password`
- **Submit:** `Log in →`
- **Google button:** `Continue with Google`
- **Forgot password:** `Forgot password?`
- **Error:** `Invalid email or password.`

### 2.10 Open questions

- [Q7] Auth token strategy: JWT in httpOnly cookie means frontend cannot read tier from cookie. Must call `/api/auth/me` on mount. Design assumes this round-trip is acceptable (may show skeleton until resolved).

---

## 3. "My Plans" Page

**WBS ID:** SaaS-2.4  
**Route:** `/my-plans`  
**Purpose:** List view of saved plans for authenticated users. Core free-tier value.  

### 3.1 User flow

User clicks "My plans" in Nav → **My Plans page loads** → GET `/api/plans` → Render grid of plan cards.  

**Empty exit:** No saved plans → Empty state with CTA to `/app`.  
**Error exit:** Network error → Inline error banner with retry button.  

### 3.2 Layout

```
┌─────────────────────────────────────────┐
│  NAV                                    │
├─────────────────────────────────────────┤
│                                         │
│  HEADING                                │
│  "MY PLANS"                             │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ CARD 1  │ │ CARD 2  │ │ CARD 3  │   │
│  │         │ │         │ │         │   │
│  │ Title   │ │ Title   │ │ Title   │   │
│  │ Date    │ │ Date    │ │ Date    │   │
│  │ [Open]  │ │ [Open]  │ │ [Open]  │   │
│  │ [Del]   │ │ [Del]   │ │ [Del]   │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│                                         │
│  [Upgrade CTA — if limit hit]           │
│                                         │
└─────────────────────────────────────────┘
```

### 3.3 Component hierarchy

- `MyPlansPage`
  - `Nav`
  - `PageHeader` (h1 "My plans", display font)
  - `PlanGrid` (responsive grid)
    - `PlanCard` (repeated)
      - `PlanTitle` (derived from idea description, truncated)
      - `PlanDate` (generated date)
      - `PlanMeta` (optional: industry, stage)
      - `OpenButton` (primary)
      - `DeleteButton` (ghost, with confirm dialog)
  - `EmptyState` (conditionally rendered)
    - `EmptyIllustration` (geometric placeholder or icon)
    - `EmptyTitle` ("No saved plans yet")
    - `EmptyCTA` ("Generate your first plan →")
  - `UpgradeCTA` (conditionally rendered at bottom, see §5)
  - `ErrorBanner` (conditionally rendered)

### 3.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| PlanCard | `bg: var(--surface-2); border: var(--border)` | `border-color: var(--accent-border)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| PlanTitle | `color: var(--text); font-family: var(--f-display); uppercase` | — | — | — | — | — | — | — |
| PlanDate | `color: var(--text-3)` | — | — | — | — | — | — | — |
| OpenButton | `bg: var(--accent); color: #000` | `bg: var(--accent-hover)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| DeleteButton | `bg: transparent; color: var(--text-3); border: var(--border)` | `color: var(--text); border-color: var(--border-strong)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| SkeletonCard | `bg: var(--surface); border: var(--border)` | — | — | — | — | — | — | — |
| SkeletonBar | `bg: var(--border); height: 12px` | — | — | — | — | — | — | — |

**Page-level states:**
- **Loading:** Skeleton cards (3 cards) shown in grid. Heading visible.
- **Empty:** Grid hidden, empty state shown.
- **Populated:** Grid rendered with plan cards.
- **Error:** Error banner at top of page, grid hidden if no cached data.
- **Delete confirm:** Dialog/modal overlay on the card: "Delete this plan? This cannot be undone." with "Cancel" and "Delete" buttons.

### 3.5 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| PageHeader | mount | opacity + translateY | 400ms | var(--ease-spring) |
| PlanCard | mount (staggered) | opacity + translateY | 300ms | var(--ease-spring) |
| PlanCard | delete | opacity + scale | 200ms | var(--ease-out) |
| EmptyState | mount | opacity + translateY | 400ms | var(--ease-spring) |
| SkeletonBar | pulse | opacity | 1.4s | ease-in-out (infinite) |

**Stagger:** Cards animate in with `delay: index * 0.06s` (max 0.3s).

### 3.6 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Single column grid. Cards full-width. Padding: `1.5rem 1rem`. |
| 640–1024px (tablet) | 2-column grid. Gap: `1rem`. Padding: `2rem 1.5rem`. |
| > 1024px (desktop) | 3-column grid. Gap: `1.25rem`. Max-width: `1080px` centered. Padding: `3rem 2rem`. |

### 3.7 Token usage

- `--bg`, `--surface`, `--surface-2`, `--border`, `--border-strong`, `--text`, `--text-3`, `--accent`, `--accent-hover`, `--accent-border`, `--accent-bg`, `--error-text`.

### 3.8 Accessibility notes

- **Heading:** Single `<h1>` "My plans".
- **Card semantics:** Each card is an `<article>` with `aria-labelledby` pointing to the title.
- **Delete confirm:** Modal dialog with focus trap. `aria-describedby` on the confirm button pointing to warning text.
- **Keyboard:** Tab through cards in reading order. Enter or Space on "Open" navigates to `/app?plan_id=xxx`.
- **WCAG:** 1.3.1 (info and relationships), 2.4.6 (headings and labels), 2.1.1 (keyboard).

### 3.9 Copy and content

- **Page title:** `My plans`
- **Empty title:** `No saved plans yet`
- **Empty body:** `Generate a business plan and save it to build your portfolio.`
- **Empty CTA:** `Generate your first plan →`
- **Card date format:** `Generated on Jun 11, 2026`
- **Open button:** `Open`
- **Delete button aria-label:** `Delete plan [TITLE]`
- **Delete confirm title:** `Delete plan?`
- **Delete confirm body:** `This plan will be permanently removed. This cannot be undone.`
- **Delete confirm cancel:** `Cancel`
- **Delete confirm action:** `Delete`
- **Error banner:** `Failed to load your plans. [Retry]`

### 3.10 Open questions

- [Q3] Free tier plan limit: Is it 3 saved plans? Affects the "X/3 plans saved" indicator copy.
- [Q6] Session-to-account migration: If yes, show a banner on first login: "Your current plan has been saved."

---

## 4. Free-Account Prompt Banner

**WBS ID:** SaaS-2.7  
**Trigger:** After 1st plan reaches `done` state.  
**Purpose:** Convert anonymous users to free accounts for retention.  

### 4.1 User flow

Plan reaches `done` → Banner slides up from bottom → User clicks "Create account" → Auth Modal opens (signup tab) → User dismisses → Banner hidden, 24h cooldown via `localStorage`.  

**2nd plan:** If user generates a 2nd plan without account, banner becomes an inline card below the ActionStack (more prominent).  

### 4.2 Layout

**Banner variant (1st plan):**
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │  [ICON]  Save this plan — create   │ │
│  │  a free account in 10 seconds.     │ │
│  │         [Create account]  [Dismiss]│ │
│  └─────────────────────────────────────┘ │
│              (fixed bottom, non-blocking) │
└─────────────────────────────────────────┘
```

**Inline card variant (2nd plan):**
```
┌─────────────────────────────────────────┐
│  ... plan content ...                   │
│  [ActionStack]                          │
│  ─────────────────────────────────────  │
│  ┌─────────────────────────────────────┐
│  │  SAVE YOUR WORK                      │
│  │  Create a free account to save this  │
│  │  plan and access it anytime.         │
│  │         [Create account →]  [×]      │
│  └─────────────────────────────────────┘
│                                         │
└─────────────────────────────────────────┘
```

### 4.3 Component hierarchy

- `FreeAccountPrompt` (conditionally rendered)
  - `BannerVariant` (fixed bottom, 1st plan)
    - `PromptIcon` (optional: bookmark or save icon)
    - `PromptText`
    - `CTAButton` (primary)
    - `DismissButton` (ghost)
  - `InlineCardVariant` (below ActionStack, 2nd plan)
    - `CardHeader` (eyebrow + title)
    - `CardBody`
    - `CTAButton`
    - `DismissButton`

### 4.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| Banner | `bg: var(--surface-2); border-top: var(--border-strong)` | — | — | — | — | — | — | — |
| InlineCard | `bg: var(--surface-2); border: var(--border-strong)` | `border-color: var(--accent-border)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| CTAButton | `bg: var(--accent); color: #000` | `bg: var(--accent-hover)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| DismissButton | `color: var(--text-3)` | `color: var(--text)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |

**Component-level states:**
- **Visible:** Banner/card rendered.
- **Dismissed:** Hidden. `localStorage` key `forge:prompt:dismissed` with timestamp. Checked on mount.
- **Cooldown active:** If dismissed < 24h, do not render.
- **More prominent (2nd plan):** Render inline card instead of banner. Same dismissal logic.

### 4.5 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| Banner | appear | translateY (100% → 0) + opacity | 400ms | var(--ease-spring) |
| Banner | dismiss | translateY (0 → 100%) + opacity | 250ms | var(--ease-out) |
| InlineCard | appear | opacity + translateY (12px → 0) | 300ms | var(--ease-spring) |
| InlineCard | dismiss | opacity + scale (1 → 0.98) | 200ms | var(--ease-out) |

### 4.6 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Banner: full-width, padding `1rem`. CTA and dismiss stacked vertically. Inline card: full-width below ActionStack. |
| ≥ 640px (desktop) | Banner: content in single row (text left, buttons right). Inline card: horizontal layout with text left, CTA right. |

### 4.7 Token usage

- `--surface-2`, `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-border`, `--text`, `--text-3`.

### 4.8 Accessibility notes

- **Non-blocking:** Banner does not trap focus or block interaction with the plan.
- **ARIA:** `role="status"`, `aria-live="polite"` on banner text so screen readers announce it when it appears.
- **Dismiss:** `aria-label="Dismiss save prompt"`.
- **WCAG:** 1.4.13 (content on hover or focus — banner is persistent, not hover-dependent), 4.1.3 (status messages).

### 4.9 Copy and content

**Banner (1st plan):**
- **Text:** `Save this plan — create a free account in 10 seconds.`
- **CTA:** `Create account`
- **Dismiss:** `Dismiss`

**Inline card (2nd plan):**
- **Eyebrow:** `SAVE YOUR WORK`
- **Title:** `Don't lose your progress`
- **Body:** `Create a free account to save this plan and access it anytime.`
- **CTA:** `Create account →`
- **Dismiss:** `×` (icon, aria-label `Dismiss`)

### 4.10 Open questions

- [Q6] Should the prompt auto-appear again after 24h even if user hasn't generated a new plan? (Yes, per PRD AC-F1.3.)

---

## 5. Upgrade CTA (Pro Tier)

**WBS ID:** SaaS-3.6  
**Trigger:** Free user hits 3-plan save limit; or clicks "Upgrade" in Nav.  
**Purpose:** Revenue activation — convert free users to Pro ($19/mo).  

### 5.1 User flow

Free user attempts to save 4th plan → API returns 403 `PLAN_LIMIT_REACHED` → **Upgrade CTA appears** on "My plans" and in `/app` → User clicks "Upgrade to Pro" → Redirect to Stripe Checkout → Payment success → Redirect to `/app?success=1` → Success toast → Pro badge appears.  

### 5.2 Layout

```
┌─────────────────────────────────────────┐
│  UPGRADE CARD                           │
│  background: var(--surface-2)             │
│  border: 1px solid var(--accent-border) │
│                                         │
│  [Pro icon]  YOU'VE REACHED YOUR LIMIT  │
│                                         │
│  "You've saved 3 plans. Upgrade to Pro  │
│   for unlimited plans, priority         │
│   generation, and clean exports."       │
│                                         │
│  • Unlimited plans                      │
│  • No watermark on exports              │
│  • Priority generation queue            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ UPGRADE TO PRO — $19/MONTH    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [See what you get] → (scrolls to comp) │
│                                         │
└─────────────────────────────────────────┘
```

### 5.3 Component hierarchy

- `UpgradeCTA` (conditionally rendered)
  - `UpgradeCard`
    - `CardHeader` (icon + eyebrow + title)
    - `CardBody` (description)
    - `BenefitsList` (ul with checkmarks)
      - `BenefitItem` (repeated)
    - `PrimaryCTA` (Stripe Checkout link)
    - `SecondaryLink` (scrolls to comparison)

### 5.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| UpgradeCard | `bg: var(--surface-2); border: var(--accent-border)` | `border-color: var(--accent)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| PrimaryCTA | `bg: var(--accent); color: #000` | `bg: var(--accent-hover)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| SecondaryLink | `color: var(--text-3); text-decoration: underline` | `color: var(--accent)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| BenefitItem | `color: var(--text-2)` | — | — | — | — | — | — | — |
| Checkmark | `color: var(--accent)` | — | — | — | — | — | — | — |

**Component-level states:**
- **Visible:** Rendered when `tier === 'free'` and `planCount >= 3` (or on explicit "Upgrade" click).
- **Hidden:** Not rendered for Pro or Team users.
- **Loading (checkout):** Primary CTA shows "Redirecting..." with reduced opacity.

### 5.5 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| UpgradeCard | appear | opacity + translateY (16px → 0) | 350ms | var(--ease-spring) |
| BenefitItem | appear (stagger) | opacity + translateX (-8px → 0) | 250ms | var(--ease-spring) |
| PrimaryCTA | hover | background color | 150ms | ease-out |

### 5.6 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Full-width card. Padding: `1.5rem`. Benefits list single column. CTA full-width. |
| ≥ 640px (desktop) | Card max-width: `640px`. Padding: `2rem`. Benefits in single column (compact). CTA auto-width. |

### 5.7 Token usage

- `--surface-2`, `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-border`, `--accent-bg`, `--text`, `--text-2`, `--text-3`.

### 5.8 Accessibility notes

- **Heading:** Card contains an `<h2>` or `<h3>` (depending on page context) with the limit message.
- **List:** Benefits list uses `<ul>` with `<li>`.
- **Focus:** Primary CTA is focusable and has visible focus ring.
- **WCAG:** 1.3.1 (lists), 2.4.6 (headings), 1.4.3 (contrast).

### 5.9 Copy and content

- **Eyebrow:** `PRO`
- **Title:** `You've reached your 3-plan limit`
- **Body:** `Upgrade to Pro for unlimited plans, priority generation, and clean exports.`
- **Benefits:**
  - `Unlimited plans`
  - `No watermark on .docx and .pdf exports`
  - `Priority generation queue`
- **Primary CTA:** `Upgrade to Pro — $19/month`
- **Secondary link:** `See what you get`

### 5.10 Open questions

- [Q2] Plan limit enforcement: Hard cap (API rejects) or soft cap (UI prompt only)? Design assumes hard cap (403 error) because the CTA must appear at the exact moment of rejection.
- [Q10] Annual discount: If yes, add "Save 2 months with annual billing" as a secondary line below the CTA.

---

## 6. Pro Badge & Tier-Aware UI

**WBS ID:** SaaS-3.7  
**Scope:** Nav, ActionStack, Export flow, "My plans" page.  
**Purpose:** Communicate tier status and conditionally show/hide features.  

### 6.1 Layout

**Nav (authenticated):**
```
┌─────────────────────────────────────────┐
│  FORGE        [My plans]  [Billing]     │
│                         [user@email.com] [PRO]
│                                         │
└─────────────────────────────────────────┘
```

**Tier indicators:**
- **Free user:** Shows "3/3 plans saved" text in Nav or on "My plans" page. Watermark on exports.
- **Pro user:** Shows "PRO" badge in Nav. No watermark. Priority indicator (optional: small "⚡ Priority" text near generation button).
- **Team user:** Shows "TEAM" badge in Nav.

### 6.2 Component hierarchy

- `TierAwareShell`
  - `Nav`
    - `AuthSection` (conditionally rendered)
      - `UserEmail` (truncated)
      - `TierBadge` ("PRO", "TEAM", or hidden)
      - `MyPlansLink`
      - `BillingLink` (Pro/Team only)
      - `LogoutButton`
  - `ActionStack`
    - `SavePlanButton` (hidden if anonymous and not done)
    - `PlanLimitIndicator` (free only: "3/3 saved")
  - `ExportFlow`
    - `WatermarkIndicator` (free only: subtle text "Generated with Forge — forgeplans.com" in document footer)

### 6.3 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| TierBadge — Pro | `bg: var(--pro-badge-bg); border: var(--pro-badge-border); color: var(--accent)` | — | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| TierBadge — Team | `bg: rgba(41, 171, 226, 0.12); border: rgba(41, 171, 226, 0.4); color: var(--cyan-pulse)` | — | `outline: 2px solid var(--cyan-pulse)` | — | — | — | — | — |
| PlanLimitIndicator | `color: var(--text-3)` | — | — | — | — | — | — | — |
| SavePlanButton | `bg: var(--accent); color: #000` | `bg: var(--accent-hover)` | `outline: 2px solid var(--accent)` | — | — | — | — | `opacity: 0.3` (at limit) |

**Loading state:** While `/api/auth/me` is fetching, show skeleton placeholder in Nav (small rectangle, `40×24px`, `bg: var(--border)`).

### 6.4 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| TierBadge | mount | opacity + scale | 200ms | var(--ease-spring) |
| PlanLimitIndicator | limit reached | color transition to `--accent` | 200ms | ease-out |
| SavePlanButton | limit reached | opacity to 0.3 | 150ms | ease-out |

### 6.5 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Nav collapses to hamburger menu. Tier badge and user email move into mobile menu. Plan limit indicator shown below page heading. |
| ≥ 640px (desktop) | All elements inline in Nav. |

### 6.6 Token usage

- `--pro-badge-bg`, `--pro-badge-border`, `--accent`, `--accent-hover`, `--cyan-pulse`, `--text`, `--text-3`, `--border`, `--surface`.

### 6.7 Accessibility notes

- **Badge semantics:** `span` with `aria-label="Pro subscription active"` or `aria-label="Team subscription active"`.
- **Color alone:** Tier is communicated by text ("PRO", "TEAM") not just color.
- **Plan limit:** "3/3" is text, not just a progress bar.
- **WCAG:** 1.4.1 (use of color), 4.1.2 (name, role, value).

### 6.8 Copy and content

- **Pro badge:** `PRO`
- **Team badge:** `TEAM`
- **Free limit indicator:** `3/3 plans saved`
- **Priority indicator:** `⚡ Priority`
- **Watermark (document footer):** `Generated with Forge — forgeplans.com`

### 6.9 Open questions

- [Q4] Team tier seat management: Admin invite or self-join code? Affects whether "TEAM" badge shows a dropdown for seat management.

---

## 7. Hero Rewrite & Audience Positioning

**WBS ID:** SaaS-4.7  
**Page:** `pages/index.tsx` (Landing page)  
**Purpose:** Position Forge for serious founders, not generic "business idea" tourists.  

### 7.1 User flow

User visits `/` → Hero section renders with new copy → User reads headline + sub-headline → CTA row.  

### 7.2 Layout

```
┌─────────────────────────────────────────┐
│  NAV                                    │
├─────────────────────────────────────────┤
│                                         │
│         YOUR BUSINESS IDEA,            │
│         TAKEN SERIOUSLY.               │
│                                         │
│   Investor-ready business plans in     │
│   minutes. No templates. No generic     │
│   filler.                               │
│                                         │
│   [Generate my plan — it's free →]     │
│   [See a sample plan first →]          │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│   BUILT FOR EARLY-STAGE FOUNDERS        │
│   WHO NEED A CREDIBLE FIRST DRAFT —    │
│   NOT A GENERIC TEMPLATE, AND NOT A    │
│   $3,000 CONSULTANT.                    │
│                                         │
└─────────────────────────────────────────┘
```

### 7.3 Component hierarchy

- `LandingHero` (existing component, modified)
  - `Eyebrow` (optional: "Business plan generator")
  - `Headline` (h1)
  - `SubHeadline` (p)
  - `CTARow` (flex, centered)
    - `PrimaryCTA` (Link to `/app`)
    - `SecondaryCTA` (Link to `/demo`)
  - `AudiencePositioning` (blockquote or p, below hero)

### 7.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| Headline | `color: var(--text); font-family: var(--f-display); uppercase` | — | — | — | — | — | — | — |
| SubHeadline | `color: var(--text-2); font-family: var(--f-ui)` | — | — | — | — | — | — | — |
| PrimaryCTA | `bg: var(--accent); color: #000` | `bg: var(--accent-hover)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| SecondaryCTA | `bg: transparent; border: var(--border-strong); color: var(--text)` | `border-color: var(--accent-border); color: var(--accent)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| AudiencePositioning | `color: var(--text-2); border-left: 2px solid var(--accent)` | — | — | — | — | — | — | — |

### 7.5 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| Headline | mount | opacity + translateY + blur | 700ms | var(--ease-spring) |
| SubHeadline | mount | opacity + translateY | 600ms | var(--ease-spring) |
| CTARow | mount | opacity + translateY | 550ms | var(--ease-spring) |
| AudiencePositioning | mount | opacity + translateY | 500ms | var(--ease-spring) |

**Stagger:** Headline (delay 0.1s) → SubHeadline (delay 0.25s) → CTARow (delay 0.4s) → AudiencePositioning (delay 0.55s).

### 7.6 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Headline `font-size: clamp(2.5rem, 7vw, 6.5rem)` scales down. CTAs stack vertically, full-width. Audience positioning block padding reduced. |
| ≥ 640px (desktop) | Headline max `6.5rem`. CTAs side-by-side. Audience positioning block centered with `max-width: 720px`. |

### 7.7 Token usage

- `--text`, `--text-2`, `--text-3`, `--accent`, `--accent-hover`, `--border-strong`, `--accent-border`, `--accent-bg`.

### 7.8 Accessibility notes

- **Heading:** Single `<h1>` on page.
- **Audience positioning:** Use `<blockquote>` or `<p>` with `aria-describedby` if it elaborates on the hero.
- **CTAs:** Both are `<a href>` with visible focus rings.
- **WCAG:** 2.4.6 (headings and labels), 1.4.3 (contrast), 2.1.1 (keyboard).

### 7.9 Copy and content

- **Headline:** `Your business idea, taken seriously.`
- **Sub-headline:** `Investor-ready business plans in minutes. No templates. No generic filler.`
- **Primary CTA:** `Generate my plan — it's free →`
- **Secondary CTA:** `See a sample plan first →`
- **Audience positioning:** `Built for early-stage founders who need a credible first draft — not a generic template, and not a $3,000 consultant.`

### 7.10 Open questions

- None. Copy is locked per PRD AC-L1.1–AC-L1.3.

---

## 8. Distribution Hooks

**WBS ID:** SaaS-4.8  
**Page:** `pages/index.tsx` (Landing page, below main features, above footer)  
**Purpose:** Lead gen for Team tier (coaches, cohorts, agencies).  

### 8.1 User flow

User scrolls to distribution section → Reads heading + body → CTA → Opens external link (Calendly / typeform / emailto).  

### 8.2 Layout

```
┌─────────────────────────────────────────┐
│  ... existing sections ...              │
│  ─────────────────────────────────────  │
│                                         │
│  FOR COACHES & COHORTS                  │
│  Running an accelerator or coaching     │
│  founders? Manage multiple clients      │
│  under one billing account with         │
│  white-label exports and batch          │
│  generation.                            │
│                                         │
│  [Learn about team licensing →]         │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  FOR AGENCIES                           │
│  White-label business plans for your    │
│  clients. No Forge branding. Batch      │
│  generate up to 10 plans in one session.  │
│                                         │
│  [Let's talk →]                         │
│                                         │
│  ─────────────────────────────────────  │
│  ... footer ...                         │
└─────────────────────────────────────────┘
```

### 8.3 Component hierarchy

- `DistributionSection` (new section in Landing)
  - `DistributionBlock` (repeated for each audience)
    - `Eyebrow` (audience label)
    - `Heading` (h2 or h3)
    - `Body` (p)
    - `CTALink` (external anchor)

### 8.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| DistributionBlock | `bg: var(--surface-2); border: var(--border)` | `border-color: var(--accent-border)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| Eyebrow | `color: var(--accent); letter-spacing: 0.2em` | — | — | — | — | — | — | — |
| Heading | `color: var(--text); font-family: var(--f-display); uppercase` | — | — | — | — | — | — | — |
| Body | `color: var(--text-2); font-family: var(--f-ui)` | — | — | — | — | — | — | — |
| CTALink | `color: var(--accent); text-decoration: underline` | `color: var(--accent-text)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |

### 8.5 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| DistributionBlock | in-view | opacity + translateY | 500ms | var(--ease-spring) |
| CTALink | hover | color transition | 150ms | ease-out |

### 8.6 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Blocks stack vertically, full-width. Padding: `2rem 1.25rem`. |
| ≥ 640px (desktop) | Blocks in 2-column grid or single column with `max-width: 800px`. Padding: `3rem 2rem`. |

### 8.7 Token usage

- `--surface-2`, `--border`, `--border-strong`, `--accent`, `--accent-text`, `--accent-border`, `--text`, `--text-2`.

### 8.8 Accessibility notes

- **External links:** `rel="noopener noreferrer"`, `target="_blank"`. `aria-label` includes "opens in new tab".
- **Headings:** Proper heading hierarchy (h2 for section, h3 for block titles).
- **WCAG:** 2.4.4 (link purpose in context), 3.2.5 (change on request — external link opens in new tab).

### 8.9 Copy and content

**Coaches & Cohorts block:**
- **Eyebrow:** `FOR COACHES & COHORTS`
- **Heading:** `Running an accelerator or coaching founders?`
- **Body:** `Manage multiple clients under one billing account with white-label exports and batch generation. Up to 5 seats. One invoice.`
- **CTA:** `Learn about team licensing →`

**Agencies block (if in scope):**
- **Eyebrow:** `FOR AGENCIES`
- **Heading:** `White-label business plans for your clients`
- **Body:** `Remove all Forge branding from exports. Batch generate up to 10 plans in one session. Perfect for agencies serving founder clients.`
- **CTA:** `Let's talk →`

### 8.10 Open questions

- [S2] Is the "For agencies" block in scope? PRD says "if S2 is in scope". Design includes it as optional.
- [Q1] Payment processor: If Stripe only, CTA links to Calendly/typeform. If Paddle/PayPal, CTA may link to a pricing page instead.

---

## 9. Demo Scenario Tabs

**WBS ID:** SaaS-4.9  
**Page:** `/demo`  
**Purpose:** Replace neutral demo with high-converting scenarios.  

### 9.1 User flow

User visits `/demo` → Default tab loads first scenario → User clicks another tab → Plan content updates → Banner text updates.  

### 9.2 Layout

```
┌─────────────────────────────────────────┐
│  NAV                                    │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ Tab 1  │ │ Tab 2  │ │ Tab 3  │       │
│  │ ACTIVE │ │        │ │        │       │
│  └────────┘ └────────┘ └────────┘       │
│                                         │
│  [DEMO PLAN banner — text updates]      │
│                                         │
│  [Plan content — updates per tab]      │
│                                         │
│  [Done bar with download]               │
│                                         │
└─────────────────────────────────────────┘
```

### 9.3 Component hierarchy

- `DemoPage` (modified)
  - `Nav`
  - `TabSwitcher` (new)
    - `TabButton` (repeated, 3 tabs)
  - `DemoBanner` (text updates per scenario)
  - `PlanContent` (switches based on active tab)
  - `DoneBar` (download button)
  - `InvestorQuestionsList`

### 9.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| TabButton — active | `bg: var(--accent); color: #000; border: var(--accent)` | — | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| TabButton — inactive | `bg: var(--surface-2); color: var(--text-2); border: var(--border)` | `border-color: var(--accent-border); color: var(--text)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| TabContent | `opacity: 1` | — | — | — | `opacity: 0.5` (switching) | — | — | — |

**Tab-level states:**
- **Default:** First tab active.
- **Switching:** Content fades out (100ms), then fades in (200ms) with new data.
- **Loading:** If fixture data is large, show skeleton during tab switch (rare, fixtures are local JSON).

### 9.5 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| TabButton | active switch | background + color | 150ms | ease-out |
| TabContent | switch | opacity (1 → 0.5 → 1) | 200ms | ease-out |
| DemoBanner | switch | opacity + translateY | 250ms | var(--ease-spring) |

### 9.6 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Tabs scroll horizontally if needed (`overflow-x: auto`). Tab text: `0.75rem`. Padding: `0.5rem 0.75rem`. |
| ≥ 640px (desktop) | Tabs centered, auto-width. Tab text: `0.875rem`. Padding: `0.625rem 1.25rem`. |

### 9.7 Token usage

- `--surface-2`, `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--text`, `--text-2`, `--text-3`.

### 9.8 Accessibility notes

- **Tab semantics:** `role="tablist"`, `role="tab"`, `role="tabpanel"`. `aria-selected` toggles on active tab. `aria-controls` points to tabpanel id.
- **Keyboard:** Left/Right arrows switch tabs. Tab key moves focus into tabpanel content.
- **Screen reader:** Announce "Showing [scenario name] demo plan" when tab switches.
- **WCAG:** 4.1.2 (name, role, value), 2.1.1 (keyboard).

### 9.9 Copy and content

**Tabs:**
- `Micro-SaaS for designers`
- `Food delivery in Lagos`
- `Online education platform`

**Banner text (per tab):**
- Tab 1: `Demo plan: AI-powered design asset organizer for freelance designers.`
- Tab 2: `Demo plan: Hyper-local food delivery platform for Lagos neighborhoods.`
- Tab 3: `Demo plan: Async learning platform for professional skill certification.`

### 9.10 Open questions

- None. Scenarios are locked per PRD AC-L3.1.

---

## 10. Password Reset Flow

**WBS ID:** SaaS-2.9  
**Trigger:** "Forgot password?" link in Auth Modal (login tab).  
**Purpose:** Self-service password reset.  

### 10.1 User flow

User clicks "Forgot password?" → **Password Reset Modal opens** (Step 1) → Email input + "Send reset link" → Submit → POST `/api/auth/password-reset` → **Step 2:** "Check your email" confirmation → User clicks link in email → Lands on `/reset-password?token=xxx` → **Step 3:** New password + confirm + "Reset password" → Submit → POST `/api/auth/password-reset-confirm` → Success → Auto-login → Redirect to `/app`.  

### 10.2 Layout

**Step 1 — Request reset:**
```
┌─────────────────────────────────────────┐
│  BACKDROP                               │
│     ┌─────────────────────────────┐     │
│     │  RESET YOUR PASSWORD          │     │
│     │                             │     │
│     │  Enter your email and we'll  │     │
│     │  send you a reset link.      │     │
│     │                             │     │
│     │  [Email input]              │     │
│     │                             │     │
│     │  [Send reset link →]        │     │
│     │                             │     │
│     │  [Back to log in]           │     │
│     └─────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**Step 2 — Confirmation:**
```
┌─────────────────────────────────────────┐
│     ┌─────────────────────────────┐     │
│     │  CHECK YOUR EMAIL           │     │
│     │                             │     │
│     │  We've sent a password      │     │
│     │  reset link to              │     │
│     │  [user@email.com]           │     │
│     │                             │     │
│     │  [Resend link]  [Back]      │     │
│     └─────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**Step 3 — Reset form (page or modal):**
```
┌─────────────────────────────────────────┐
│  NAV                                    │
├─────────────────────────────────────────┤
│                                         │
│  CREATE NEW PASSWORD                     │
│                                         │
│  New password              [show/hide]  │
│  Confirm password          [show/hide]  │
│                                         │
│  [Reset password →]                     │
│                                         │
└─────────────────────────────────────────┘
```

### 10.3 Component hierarchy

- `PasswordResetFlow`
  - `Step1RequestModal`
    - `EmailInput`
    - `SubmitButton`
    - `BackLink`
  - `Step2ConfirmationModal`
    - `ConfirmationText`
    - `ResendButton`
    - `BackButton`
  - `Step3ResetPage` (or modal)
    - `NewPasswordInput`
    - `ConfirmPasswordInput`
    - `VisibilityToggle` (both inputs)
    - `SubmitButton`
    - `ErrorMessage`

### 10.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| Step1 EmailInput | same as Auth Modal EmailInput | — | same | — | — | placeholder | same error | — |
| Step1 SubmitButton | `bg: var(--accent); color: #000` | `bg: var(--accent-hover)` | `outline: 2px solid var(--accent)` | — | spinner | — | — | `opacity: 0.3` (empty) |
| Step2 ResendButton | `color: var(--accent); text-decoration: underline` | `color: var(--accent-text)` | `outline: 2px solid var(--accent)` | — | — | — | — | — |
| Step3 NewPasswordInput | same as Auth Modal PasswordInput | — | same | — | — | placeholder | same error | — |
| Step3 SubmitButton | same as Step1 SubmitButton | — | — | — | — | — | — | disabled if mismatch |

**Flow-level states:**
- **Step 1 — Empty:** Email input empty, submit disabled.
- **Step 1 — Validating:** Email format check on blur.
- **Step 1 — Submitting:** Button loading, input disabled.
- **Step 1 — Success:** Transition to Step 2 (modal content swaps).
- **Step 1 — Error:** Inline error: "We couldn't find an account with that email."
- **Step 2 — Resending:** Resend button shows "Sending..." for 2s, then "Sent!".
- **Step 3 — Empty:** Both password fields empty, submit disabled.
- **Step 3 — Validating:** Password < 8 chars → inline error. Mismatch → inline error.
- **Step 3 — Submitting:** Button loading.
- **Step 3 — Success:** Auto-login, redirect to `/app`.
- **Step 3 — Error (invalid token):** Inline error: "This reset link has expired or is invalid. Please request a new one."

### 10.5 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| Step 1 → Step 2 | success | opacity + translateX (slide left) | 250ms | var(--ease-spring) |
| Step 2 → Step 1 | back | opacity + translateX (slide right) | 250ms | var(--ease-spring) |
| ErrorMessage | appear | opacity + translateY | 150ms | ease-out |
| Step 3 page | mount | opacity + translateY | 400ms | var(--ease-spring) |

### 10.6 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Modals become full-width sheets at bottom. Step 3 page padding: `2rem 1rem`. Inputs: `min-height: 48px`. |
| ≥ 640px (desktop) | Centered modals, `max-width: 440px`. Step 3 page max-width: `420px` centered. |

### 10.7 Token usage

Same as Auth Modal plus `--error-text`, `--error-border`.

### 10.8 Accessibility notes

- **Focus trap:** Same as Auth Modal for Step 1 and 2.
- **Step 3 page:** Standard page focus order. First focus on "New password" input.
- **Password visibility:** Toggle buttons have `aria-label` and `aria-pressed`.
- **ARIA:** Step 1 modal: `role="dialog"`, `aria-modal="true"`. Step 3 page: no modal role needed.
- **WCAG:** 3.3.1 (error identification), 3.3.3 (error suggestion), 2.4.3 (focus order).

### 10.9 Copy and content

**Step 1:**
- **Title:** `Reset your password`
- **Body:** `Enter your email and we'll send you a reset link.`
- **Input placeholder:** `your@email.com`
- **Submit:** `Send reset link →`
- **Back:** `Back to log in`
- **Error:** `We couldn't find an account with that email.`

**Step 2:**
- **Title:** `Check your email`
- **Body:** `We've sent a password reset link to [email].`
- **Resend:** `Resend link`
- **Back:** `Back`
- **Resend success:** `Sent!`

**Step 3:**
- **Title:** `Create new password`
- **New password placeholder:** `New password (min. 8 characters)`
- **Confirm placeholder:** `Confirm new password`
- **Submit:** `Reset password →`
- **Match error:** `Passwords do not match.`
- **Length error:** `Password must be at least 8 characters.`
- **Token error:** `This reset link has expired or is invalid. Please request a new one.`

### 10.10 Open questions

- [Q5] Email verification: If email verification is required, the password reset flow must verify the email is verified before sending the link. If not, any email in the leads table can request a reset.

---

## 11. Cross-Cutting Concerns

### 11.1 Responsive breakpoints

| Name | Width | Usage |
|---|---|---|
| Mobile | < 640px | Single column, full-width sheets, stacked CTAs, 44px touch targets |
| Tablet | 640–1024px | 2-column grids, side-by-side CTAs, increased padding |
| Desktop | > 1024px | 3-column grids, max-width containers (`1080px`), sticky side rails |

### 11.2 Animation defaults

All motion uses `framer-motion` v12. Default transition:
```
{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }
```
Respect `prefers-reduced-motion: reduce` by zeroing out all transitions and animations (see existing `@media` block in `globals.css`).

### 11.3 Accessibility checklist (WCAG 2.2 AA)

| Criterion | Status | Implementation notes |
|---|---|---|
| 1.1.1 Non-text Content | Pass | All icons have `aria-hidden` or `aria-label`. Badges have text content. |
| 1.3.1 Info and Relationships | Pass | Lists use `<ul>/<li>`, headings in order, tabs use `role="tablist"`. |
| 1.4.1 Use of Color | Pass | Tier badges show text ("PRO", "TEAM"), not just color. Errors show text, not just red border. |
| 1.4.3 Contrast (Minimum) | Pass | All body text `var(--text)` on `var(--bg)` is 21:1. Secondary text `var(--text-2)` on `var(--bg)` is ~7.5:1. Gold accent on black is ~12:1. |
| 1.4.10 Reflow | Pass | All layouts reflow to single column at 320px. No horizontal scroll. |
| 1.4.11 Non-text Contrast | Pass | Borders (`var(--border-strong)`) on `var(--bg)` are ~3.5:1. Focus rings (`var(--accent)`) are 12:1. |
| 1.4.13 Content on Hover | Pass | No hover-dependent content. All tooltips are persistent or dismissible. |
| 2.1.1 Keyboard | Pass | All interactive elements are keyboard operable. Tab order is logical. |
| 2.4.3 Focus Order | Pass | Modals trap focus. Escape closes modals. |
| 2.4.6 Headings and Labels | Pass | Single `<h1>` per page. Descriptive labels on all inputs. |
| 2.4.7 Focus Visible | Pass | All focusable elements have `outline: 2px solid var(--accent)`. Inputs have border + glow. |
| 3.2.1 On Focus | Pass | No context change on focus. |
| 3.2.5 Change on Request | Pass | External links open in new tab. No auto-redirect without user action. |
| 3.3.1 Error Identification | Pass | Inline errors below inputs. Error color is `var(--error-text)`. |
| 3.3.3 Error Suggestion | Pass | Email format error suggests valid format. Password error suggests length. |
| 4.1.2 Name, Role, Value | Pass | Badges, tabs, and buttons have proper ARIA. |
| 4.1.3 Status Messages | Pass | Banners use `aria-live="polite"`. Error messages are announced. |

### 11.4 Dark mode notes

The entire design system is dark-first (absolute black canvas). There is no light mode. All new components use the existing dark tokens exclusively. No additional dark-mode treatment needed.

### 11.5 CSS class naming convention

All new component classes must be added to the Lamborghini override block in `styles/globals.css` that forces `border-radius: 0 !important`. If a component introduces a new root class (e.g., `.email-modal`, `.auth-modal`, `.plan-card`), it must be added to the override list to maintain sharp corners.

Example addition:
```css
.email-modal, .auth-modal, .plan-card, .upgrade-cta, .free-prompt-banner, .free-prompt-inline, .demo-tab, .password-reset-modal {
    border-radius: 0 !important;
}
```

### 11.6 `cn()` usage

All class merging uses `cn()` from `lib/utils.ts` (clsx + tailwind-merge). Example:
```tsx
className={cn('action-stack-btn', 'action-stack-btn-primary', isLoading && 'opacity-70')}
```

### 11.7 shadcn/ui conventions

If any new primitive components are needed (e.g., Dialog, Tabs), they must follow shadcn conventions: use `cva` for variants, Radix `Slot` for `asChild`, and `cn()` for class merging. However, given the bespoke Lamborghini aesthetic, prefer hand-written components over generic shadcn defaults to avoid style conflicts.

---

## 12. Summary of Key Decisions

### 12.1 Deviations from existing design system

1. **Proposed new tokens:** `--pro-badge-bg`, `--pro-badge-border`, `--modal-backdrop`, `--error-text`, `--error-border`. These are necessary because the existing system lacks semantic tokens for modal overlays, tier badges, and inline validation errors.
2. **Modal radius override:** New modal classes must be added to the Lamborghini `border-radius: 0 !important` override block. This is a deviation from typical shadcn/ui modals which have rounded corners.
3. **Error color:** The existing system uses gold (`--accent`) for everything positive and interactive. Inline errors need a distinct color (`--error-text: #ff6b6b`) to avoid confusion with gold accents.
4. **No light mode:** The SaaS pivot does not introduce a light mode. All new components are dark-only.

### 12.2 Design principles maintained

- **Sharp corners:** All new components use `border-radius: 0`.
- **Uppercase display typography:** All headings and CTAs use `var(--f-display)` with `text-transform: uppercase`.
- **Gold-on-black accent:** Primary actions, badges, and focus states use `--accent` (`#ffc000`).
- **Hover feedback via color only:** No translate/scale transforms on hover, per Lamborghini override.
- **Motion respects `prefers-reduced-motion`:** All animations are gated by the existing media query.
- **Touch targets ≥44px:** All buttons and inputs meet this on mobile.
- **Focus-visible styles:** Gold outline for keyboard navigation.

### 12.3 Open questions requiring resolution

| # | Question | Blocking? | Affected components |
|---|---|---|---|
| Q1 | Payment processor (Stripe only vs. Paddle/PayPal) | Yes — affects checkout CTA copy and link | Upgrade CTA, Distribution Hooks |
| Q2 | Plan limit enforcement (hard cap vs. soft prompt) | Yes — affects Upgrade CTA timing | Upgrade CTA, My Plans |
| Q3 | Free tier plan limit (1 vs. 3 saved plans) | Yes — affects limit indicator copy | My Plans, Pro Badge |
| Q4 | Team seat management (admin invite vs. self-join) | Yes — affects Team badge UI | Pro Badge & Tier-Aware UI |
| Q5 | Email verification required before download? | Yes — affects Email Capture Modal copy | Email Capture Modal, Password Reset |
| Q6 | Session-to-account migration on signup? | No — affects Free-Account Prompt | Free-Account Prompt Banner |
| Q10 | Annual discount for Pro billing? | No — affects Upgrade CTA copy | Upgrade CTA |

---

---

## Conversion Playbook Extension (2026-06-15)

**Status:** Approved for implementation
**Date:** 2026-06-15
**Author:** UX Designer
**Scope:** Landing page buyer-facing rewrite (ADR-010), /pricing route (ADR-012/013), provider-selection checkout step, auto-save messaging reconciliation, watermark paid-state reconciliation, social-proof block.
**Baseline:** `docs/PRD-conversion-playbook.md`, `docs/ARCHITECTURE.md` sections 9A + 9A.12, ADR-009 through ADR-013, and sections 0-12 of this document (the "baseline spec" dated 2026-06-11).

**Relationship to baseline spec (sections 0-12):**
This extension does NOT replace or rewrite sections 0-12. It adds net-new surfaces and reconciles four items already partially specified in the baseline: (1) hero copy (section 7), (2) auto-save-on-signup messaging (section 4, ADR-009), (3) distribution hooks (section 8), and (4) watermark removed state (section 6). Where a baseline section already fully covers an element, this extension references it and notes only the delta. Where this extension specifies a new element, it provides the full handoff format.

**Design aesthetic:** Lamborghini-industrial. Dark-first (absolute black canvas, gold accent). Sharp corners (border-radius: 0). Uppercase display typography. Color-only hover feedback. All existing tokens from section 0.1 apply. The three.js hero canvas is a decorative layer that enhances but never replaces the static-first conversion surface.

---

### E0. Proposed New Tokens (Extension)

These are additions to the tokens proposed in section 0.3. All require approval before implementation.

| Token | Value | Rationale |
|---|---|---|
| `--success-text` | `#4ade80` | Success confirmation text (e.g., checkout return toast, auto-save confirmation). Needs to be distinct from gold accent and red error. Green-400 on black gives ~8:1 contrast. |
| `--success-bg` | `rgba(74, 222, 128, 0.08)` | Subtle success background for toast/banner elements. Mirrors the opacity pattern of `--accent-bg`. |
| `--provider-stripe-accent` | `#635bff` | Stripe brand purple for provider-choice card identity. Used only in the provider icon/label, not as a button color. Contrast on `--surface-2`: ~4.7:1. |
| `--provider-paystack-accent` | `#00c3f7` | Paystack brand teal for provider-choice card identity. Same scoped usage as Stripe. Contrast on `--surface-2`: ~7.2:1. |
| `--pricing-recommended-border` | `rgba(255, 192, 0, 0.7)` | Stronger gold border for the "recommended" pricing tier column. More visible than `--accent-border` to draw the eye to the Pro column. |
| `--pricing-recommended-bg` | `rgba(255, 192, 0, 0.04)` | Very subtle gold wash on the recommended tier column background. Lighter than `--accent-bg` to avoid visual noise in the full comparison table. |

---

### E1. Landing Page Buyer-Facing Rewrite (ADR-010)

**WBS IDs:** 2.6.1, 2.6.2, 2.6.3, 2.6.4, 2.6.5, 2.8.1, 2.8.2, 2.8.3
**Route:** `/` (`pages/index.tsx`)
**Purpose:** Transform the landing page from a builder-facing demo to a buyer-facing conversion surface. Stale copy removed. New hero with locked headline, sub-headline, and CTA copy. three.js + GSAP decorative canvas. Social proof. Distribution hooks above footer. LockedDecisions rewritten as buyer-facing differentiation.

#### E1.1 User flow

Visitor arrives at `/` -> Hero renders server-side (HeroStatic: headline, sub-headline, CTAs) -> three.js canvas loads behind hero (decorative, guarded) -> Visitor scrolls -> ProblemBlock -> HowItWorks -> SocialProofBlock -> DemoPreviewStrip (updated scenario) -> BuyerDifferentiation (replaces LockedDecisions) -> DistributionHooks (coaches/cohorts, agencies) -> FooterCTA (updated copy) -> Visitor clicks primary CTA -> navigates to `/app`.

**Alternative exits:** Secondary CTA -> `/demo`. Distribution CTA -> external contact destination. Nav "Pricing" link -> `/pricing`.

#### E1.2 Full page layout (top to bottom)

```
+---------------------------------------------+
|  NAV  [Forge logo]        [Pricing] [Log in] |
+---------------------------------------------+
|                                               |
|  [HeroCanvas — three.js, aria-hidden,         |
|   positioned behind HeroStatic, decorative]   |
|                                               |
|  YOUR BUSINESS IDEA,                          |
|  TAKEN SERIOUSLY.                             |
|                                               |
|  Forge turns one sentence into a structured,  |
|  investor-ready business plan -- drafted by   |
|  one AI agent, critiqued by another.          |
|  No templates. No blank pages. No averaging.  |
|                                               |
|  [Generate my plan -- it's free ->]           |
|  [See a sample plan first ->]                 |
|                                               |
|  "Built for early-stage founders who need a   |
|   credible first draft -- not a generic       |
|   template, and not a $3,000 consultant."     |
|                                               |
+---------------------------------------------+
|  THE PROBLEM                                  |
|  [Existing ProblemBlock — unchanged]          |
+---------------------------------------------+
|  HOW IT WORKS                                 |
|  [Existing HowItWorks — unchanged]           |
+---------------------------------------------+
|  SOCIAL PROOF                                 |
|  [SocialProofBlock — new, see E1.7]          |
+---------------------------------------------+
|  WHAT IT PRODUCES                             |
|  [DemoPreviewStrip — updated scenario]       |
+---------------------------------------------+
|  WHY FORGE IS DIFFERENT                       |
|  [BuyerDifferentiation — replaces             |
|   LockedDecisions, see E1.8]                 |
+---------------------------------------------+
|  FOR ACCELERATORS AND COHORTS                 |
|  [DistributionBlock — coaches/cohorts]       |
|  FOR BUSINESS COACHES AND AGENCIES            |
|  [DistributionBlock — agencies]              |
+---------------------------------------------+
|  READY TO FORGE YOURS?                        |
|  One sentence to start.                       |
|  [Generate my plan -- it's free ->]           |
|  [See a sample plan first ->]                 |
+---------------------------------------------+
```

#### E1.3 Component hierarchy (full landing page)

- `Landing`
  - `Nav` (modified: adds "Pricing" link, auth-aware items per baseline section 6)
  - `main.landing-main`
    - `HeroStatic` (NEW — server-rendered, always present)
      - `Headline` (h1, display font)
      - `SubHeadline` (p, UI font)
      - `CTARow`
        - `PrimaryCTA` (Link to `/app`)
        - `SecondaryCTA` (Link to `/demo`)
      - `AudiencePositioning` (p or blockquote)
    - `HeroCanvas` (NEW — dynamic import, ssr:false, aria-hidden, decorative)
    - `ProblemBlock` (existing, unchanged)
    - `HowItWorks` (existing, unchanged)
    - `SocialProofBlock` (NEW)
      - `SocialProofHeading`
      - `SocialProofGrid`
        - `SocialProofCard` (repeated, 2-3 slots)
    - `DemoPreviewStrip` (existing, updated content per WBS 2.6.5)
    - `BuyerDifferentiation` (NEW — replaces `LockedDecisions`, answers Q-P1)
      - `DiffHeading`
      - `DiffGrid`
        - `DiffCard` (repeated, 4 cards)
    - `DistributionSection` (specified in baseline section 8, positioned here)
    - `FooterCTA` (existing, updated copy per WBS 2.6.3/2.6.4)

#### E1.4 HeroStatic — detailed spec

**Requirement:** Server-rendered. Text and CTAs are the LCP element. Must be interactive before any three.js code runs. Canvas is decorative behind this.

**Copy (locked):**
- **Headline (h1):** `Your business idea, taken seriously.`
- **Sub-headline:** `Forge turns one sentence into a structured, investor-ready business plan -- drafted by one AI agent, critiqued by another. No templates. No blank pages. No averaging.`
- **Primary CTA:** `Generate my plan -- it's free ->`
- **Secondary CTA:** `See a sample plan first ->`
- **Audience positioning:** `Built for early-stage founders who need a credible first draft -- not a generic template, and not a $3,000 consultant.`

**Reconciliation with baseline section 7:** Baseline section 7 specified the hero rewrite with shorter sub-headline copy ("Investor-ready business plans in minutes. No templates. No generic filler."). The conversion playbook PRD (AC-CP2.5) requires the sub-headline to reference investor-readiness, the two-agent approach, AND the absence of templates. The copy above satisfies all three content elements. Baseline section 7 is SUPERSEDED by this extension for the sub-headline and CTA copy. All other baseline section 7 specs (state table, motion, responsive, tokens, accessibility) remain valid and are not re-stated here.

**State table (extends baseline section 7.4 — new elements only):**

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| Headline | `color: var(--text); font-family: var(--f-display); text-transform: uppercase; font-size: clamp(2.5rem, 7vw, 6.5rem)` | -- | -- | -- | -- | -- | -- | -- |
| SubHeadline | `color: var(--text-2); font-family: var(--f-ui); font-size: clamp(1rem, 2vw, 1.25rem); max-width: 640px; line-height: 1.6` | -- | -- | -- | -- | -- | -- | -- |
| PrimaryCTA | same as baseline section 7.4 | same | same | same | -- | -- | -- | -- |
| SecondaryCTA | same as baseline section 7.4 | same | same | same | -- | -- | -- | -- |
| AudiencePositioning | `color: var(--text-2); font-family: var(--f-ui); font-style: italic; border-left: 2px solid var(--accent); padding-left: 1.25rem; max-width: 600px; margin-top: 2rem` | -- | -- | -- | -- | -- | -- | -- |

**Motion spec:** Same as baseline section 7.5 with these adjustments:
- Headline stagger delay: 0.1s (unchanged)
- SubHeadline delay: 0.25s (unchanged)
- CTARow delay: 0.4s (unchanged)
- AudiencePositioning delay: 0.55s (unchanged)
- All motion zeroed when `prefers-reduced-motion: reduce`

**Responsive rules:** Same as baseline section 7.6. On mobile (< 640px), CTAs stack vertically full-width. AudiencePositioning block has reduced left padding (`0.75rem`).

#### E1.5 HeroCanvas — three.js + GSAP visual concept

**Requirement:** Decorative WebGL canvas behind HeroStatic. `aria-hidden="true"`. Loaded via `next/dynamic({ ssr: false })`. Guarded by capability checks.

**Visual concept (intent, not WebGL code):**
The canvas renders a slowly evolving abstract mesh or particle field in the gold-on-black palette. Think: a sparse constellation of gold-tinted particles or a low-poly geometric surface that subtly undulates. The visual should feel like precision engineering -- structured, not chaotic. No organic blobs or gradient washes. The aesthetic is mechanical, industrial, restrained.

**Scene palette (from CSS tokens):**
- Background: transparent (the page `--bg` shows through)
- Particle/mesh color: `--accent` (#ffc000) at ~30% opacity
- Secondary accent (subtle): `--accent-hover` (#917300) at ~15% opacity
- No other colors. The scene is monochromatic gold on black.

**Motion intent:**
- Idle state: particles or mesh vertices drift very slowly (2-4 second cycle), barely perceptible. The scene feels alive but not distracting.
- On scroll: parallax -- the scene shifts vertically at ~0.3x the scroll rate, creating depth separation from the static text.
- No interaction with mouse cursor (avoids performance cost and distraction from CTAs).

**MANDATORY fallbacks:**

| Condition | Behavior |
|---|---|
| Server-side render (SSR/SSG) | HeroStatic renders alone. No canvas markup in HTML. |
| `prefers-reduced-motion: reduce` | Guard fires first. No three.js scene initialized. No GSAP timeline started. HeroStatic is the complete hero. |
| WebGL unavailable (`canvas.getContext('webgl2'||'webgl')` returns null) | Guard fires. No three.js scene. HeroStatic is the complete hero. No console error. |
| Low-performance device (`navigator.hardwareConcurrency <= 2` or `navigator.connection.saveData === true`) | Optional guard. If implemented, same behavior: static hero only. |
| Chunk load failure (network error on dynamic import) | `next/dynamic` error boundary renders nothing extra. HeroStatic remains. No broken layout. |

**Performance budget (from ADR-010):**
- three.js + GSAP chunk: <= ~200 KB gzipped
- Initial route JS growth: <= ~10 KB gzipped (canvas code is NOT in the initial chunk)
- DPR capped at `Math.min(window.devicePixelRatio, 2)`
- Render loop paused via IntersectionObserver when canvas is off-screen
- All geometries, materials, renderer disposed on unmount

**Positioning:**
- Canvas is `position: absolute` within the hero section container, `inset: 0`, `z-index: 0`
- HeroStatic content is `position: relative`, `z-index: 1`
- Canvas has `pointer-events: none` (does not capture clicks)

**State table:**

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| HeroCanvas container | `position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 1` | -- | -- | -- | -- | -- | -- | -- |
| HeroCanvas (capable device) | Scene renders at ~30% particle opacity | -- | -- | -- | -- | -- | -- | -- |
| HeroCanvas (reduced-motion) | Not mounted. Container renders nothing. | -- | -- | -- | -- | -- | -- | -- |
| HeroCanvas (no WebGL) | Not mounted. Container renders nothing. | -- | -- | -- | -- | -- | -- | -- |
| HeroCanvas (loading chunk) | Not yet mounted. HeroStatic visible alone. No skeleton. | -- | -- | -- | -- | -- | -- | -- |

**Motion spec:**

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| Canvas opacity | mount (after guards pass) | opacity 0 -> 1 | 1200ms | ease-out |
| Particle drift | continuous (idle) | vertex positions | 2-4s cycle | linear |
| Parallax shift | scroll | translateY | continuous | linear (0.3x scroll rate) |
| Canvas opacity | unmount | opacity 1 -> 0 | 300ms | ease-out |

**Responsive rules:**

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Canvas renders at reduced complexity: fewer particles/vertices (e.g., 50% of desktop count). DPR capped at 1 on mobile. If performance is poor, the guard can skip canvas entirely on mobile. |
| >= 640px (desktop) | Full scene complexity. DPR capped at 2. |

**Accessibility notes:**
- `aria-hidden="true"` on the canvas container. Screen readers skip it entirely.
- All meaningful content (headline, sub-headline, CTAs) is in HeroStatic, which is standard server-rendered HTML.
- `prefers-reduced-motion: reduce` disables all canvas animation and the canvas itself.
- No flashing content (particles are subtle, not strobing). WCAG 2.3.1 (three flashes or below threshold) passes.

#### E1.6 Nav updates (reconciliation with baseline section 6)

Baseline section 6 fully specifies the auth-aware Nav (tier badges, email, billing link, logout). This extension adds ONE element:

**"Pricing" link in Nav:** Visible to ALL users (authenticated and anonymous). Links to `/pricing`. Positioned in the Nav items area before the auth section.

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| Pricing link | `color: var(--text-2); font-family: var(--f-ui); font-size: 0.875rem; text-decoration: none` | `color: var(--text)` | `outline: 2px solid var(--accent); outline-offset: 2px` | -- | -- | -- | -- | -- |

On mobile (< 640px), the Pricing link moves into the hamburger menu alongside other Nav items.

#### E1.7 SocialProofBlock (NEW)

**WBS ID:** 2.8.3 (part of Landing compose)
**Position:** After HowItWorks, before DemoPreviewStrip.
**Purpose:** Conversion lever. At launch, contains placeholder content per AC-CP5.2. Structure supports real testimonials when collected.

**Layout:**

```
+---------------------------------------------+
|  EARLY TRACTION                               |
|                                               |
|  +-------------------+  +-------------------+ |
|  |  "Quote text..."  |  |  "Quote text..."  | |
|  |  -- Name, Role    |  |  -- Name, Role    | |
|  +-------------------+  +-------------------+ |
|                                               |
|  [or: "Join X founders who have already       |
|   generated their first draft."]              |
+---------------------------------------------+
```

**Component hierarchy:**

- `SocialProofBlock`
  - `SectionEyebrow` ("EARLY TRACTION" or "WHAT FOUNDERS SAY")
  - `SectionHeading` (h2)
  - `ProofGrid` (2-column on desktop, 1-column on mobile)
    - `ProofCard` (repeated, 2-3 slots)
      - `QuoteText` (blockquote)
      - `Attribution` (name + role/company, both optional at launch)
  - `ProofFallback` (conditional: rendered when no real quotes exist)

**State table:**

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| SocialProofBlock | `padding: 4rem 0; max-width: 900px; margin: 0 auto` | -- | -- | -- | -- | -- | -- | -- |
| SectionEyebrow | `color: var(--accent); font-family: var(--f-ui); font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase` | -- | -- | -- | -- | -- | -- | -- |
| SectionHeading | `color: var(--text); font-family: var(--f-display); text-transform: uppercase; font-size: clamp(1.5rem, 3vw, 2.5rem)` | -- | -- | -- | -- | -- | -- | -- |
| ProofCard | `bg: var(--surface-2); border: 1px solid var(--border); padding: 1.5rem 2rem` | `border-color: var(--accent-border)` | -- | -- | -- | -- | -- | -- |
| QuoteText | `color: var(--text-2); font-family: var(--f-prose); font-style: italic; font-size: 0.9375rem; line-height: 1.6` | -- | -- | -- | -- | -- | -- | -- |
| Attribution | `color: var(--text-3); font-family: var(--f-ui); font-size: 0.8125rem; margin-top: 0.75rem` | -- | -- | -- | -- | -- | -- | -- |
| ProofFallback | `color: var(--text-2); font-family: var(--f-ui); text-align: center; font-size: 1rem` | -- | -- | -- | -- | -- | -- | -- |

**Motion spec:**

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| SectionEyebrow | in-view | opacity + translateY (8px -> 0) | 400ms | var(--ease-spring) |
| SectionHeading | in-view | opacity + translateY (14px -> 0) | 500ms | var(--ease-spring) |
| ProofCard | in-view (stagger) | opacity + translateY (18px -> 0) | 450ms, delay: index * 0.1s | var(--ease-spring) |

**Responsive rules:**

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Single column. Cards full-width. Padding: `2rem 1.25rem`. |
| >= 640px (desktop) | 2-column grid, gap: `1.25rem`. Padding: `4rem 2rem`. Max-width: `900px` centered. |

**Token usage:**
- `--accent`, `--surface-2`, `--border`, `--accent-border`, `--text`, `--text-2`, `--text-3`.

**Copy and content (launch state):**
- **Eyebrow:** `EARLY TRACTION`
- **Heading:** `Founders are already using Forge`
- **Fallback (if no quotes):** `Join the first 100 founders generating investor-ready plans. Your first draft is free.`
- **Quote slots (when populated):** `[PLACEHOLDER — collect from beta users within 30 days of launch per AC-CP5.4]`
- **Attribution format:** `-- [Name], [Role] at [Company]` (all optional; if absent, show attribution as `-- Early access founder`)
- **Hard constraint:** No unverified numerical claims. "100 founders" is only valid if verifiable. Otherwise use: `Join founders who are already generating their first draft.`

**Accessibility notes:**
- Quotes use `<blockquote>` with `<cite>` for attribution.
- Heading hierarchy: `<h2>` within the section.
- No interactive elements; no focus trap needed.
- WCAG 1.3.1 (info and relationships): semantic HTML.

#### E1.8 BuyerDifferentiation (replaces LockedDecisions, resolves Q-P1)

**WBS ID:** 2.6.2
**Purpose:** The existing `LockedDecisions` section contains stale copy ("No persistence, by design", "No accounts, no DB, no saved drafts") that contradicts the SaaS pivot. Per Q-P1 and S-P5, this extension specifies the replacement: a buyer-facing differentiation section that communicates the same architectural decisions as competitive advantages rather than builder-facing technical notes.

**Decision (resolves Q-P1):** The `LockedDecisions` section is REWRITTEN, not removed. Removal would leave a visual gap and lose the competitive-differentiation content. The section retains its grid layout and card count (reduced from 6 to 4 cards to remove the two stale items and tighten messaging). The framing shifts from "what we deliberately left out" to "why Forge is not like the others."

**Layout:**

```
+---------------------------------------------+
|  WHY FORGE IS DIFFERENT                       |
|  Not another template. Not another chatbot.   |
|                                               |
|  +-------------------+  +-------------------+ |
|  | Two agents,       |  | Schema-first      | |
|  | not one           |  | output            | |
|  | [body text]       |  | [body text]       | |
|  +-------------------+  +-------------------+ |
|  +-------------------+  +-------------------+ |
|  | Structured        |  | Honest framing    | |
|  | severity          |  |                   | |
|  | [body text]       |  | [body text]       | |
|  +-------------------+  +-------------------+ |
+---------------------------------------------+
```

**Component hierarchy:**

- `BuyerDifferentiation`
  - `SectionEyebrow`
  - `SectionHeading` (h2)
  - `SectionSubtext` (p)
  - `DiffGrid` (2x2 grid)
    - `DiffCard` (repeated, 4 cards)
      - `DiffTitle` (h4)
      - `DiffBody` (p)

**Cards content (locked):**

| Card | Title | Body |
|---|---|---|
| 1 | `Two agents, not one` | `A drafter writes your plan. A separate critic -- different prompt, zero knowledge of the drafter's reasoning -- reviews it. Self-critique is shallow. Two calls catch what one never would.` |
| 2 | `Schema-first output` | `Your plan is a typed data structure with 10 investor-standard sections -- not parsed markdown, not a wall of text. Every field is validated before you see it.` |
| 3 | `Structured severity` | `Every critique is tagged high, medium, or low. You see what matters first. The critic stays sharp without being mean or vague.` |
| 4 | `Honest framing` | `This is a pipeline: two sequential LLM calls with different prompts. Not an "autonomous agent." Not magic. Just well-engineered first drafts.` |

**Removed cards (stale):**
- "No persistence, by design" -- REMOVED (contradicts SaaS pivot)
- "FastAPI for orchestration" -- REMOVED (builder-facing, not buyer-relevant)

**State table:**

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| SectionEyebrow | `color: var(--accent); font-family: var(--f-ui); font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase` | -- | -- | -- | -- | -- | -- | -- |
| SectionHeading | `color: var(--text); font-family: var(--f-display); text-transform: uppercase` | -- | -- | -- | -- | -- | -- | -- |
| SectionSubtext | `color: var(--text-2); font-family: var(--f-ui); max-width: 580px` | -- | -- | -- | -- | -- | -- | -- |
| DiffCard | `bg: var(--surface-2); border: 1px solid var(--border); padding: 1.5rem` | `border-color: var(--accent-border)` | -- | -- | -- | -- | -- | -- |
| DiffTitle | `color: var(--text); font-family: var(--f-display); text-transform: uppercase; font-size: 1.125rem; letter-spacing: 0.04em` | -- | -- | -- | -- | -- | -- | -- |
| DiffBody | `color: var(--text-2); font-family: var(--f-ui); font-size: 0.875rem; line-height: 1.6; margin-top: 0.5rem` | -- | -- | -- | -- | -- | -- | -- |

**Motion spec:**

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| SectionHeading | in-view | opacity + translateY (14px -> 0) | 500ms | var(--ease-spring) |
| DiffCard | in-view (stagger) | opacity + translateY (14px -> 0) | 500ms, delay: index * 0.06s | var(--ease-spring) |

**Responsive rules:**

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Single column. Cards full-width. Padding: `2rem 1.25rem`. |
| >= 640px (desktop) | 2-column grid, gap: `1.25rem`. Max-width: `800px` centered. |

**Token usage:**
- `--accent`, `--surface-2`, `--border`, `--accent-border`, `--text`, `--text-2`.

**Copy and content:**
- **Eyebrow:** `WHAT MAKES IT DIFFERENT`
- **Heading:** `Not another template. Not another chatbot.`
- **Subtext:** `Four engineering decisions that shape every plan Forge generates.`

**Accessibility notes:**
- Heading hierarchy: `<h2>` for section, `<h4>` for card titles.
- Cards are `<article>` elements with `aria-labelledby` pointing to card title.
- No interactive elements within cards.
- WCAG 1.3.1, 2.4.6.

**CSS class convention:** New root class `.buyer-diff-card` must be added to the Lamborghini `border-radius: 0 !important` override block in `styles/globals.css`.

#### E1.9 FooterCTA updates (reconciliation)

Baseline FooterCTA copy is stale ("One sentence to start. No account. No saved drafts."). Per WBS 2.6.3 and 2.6.4:

**Updated copy:**
- **Heading:** `Ready to forge yours?` (unchanged)
- **Body:** `One sentence to start. Your first plan is free.`
- **Primary CTA:** `Generate my plan -- it's free ->`
- **Secondary CTA:** `See a sample plan first ->`

All state, motion, responsive, and token specs from baseline section 7.4 (same button styles) apply.

#### E1.10 DistributionSection positioning (reconciliation with baseline section 8)

Baseline section 8 fully specifies the DistributionSection. This extension adds one constraint:

**Positioning:** DistributionSection MUST appear as a first-class landing page section BETWEEN BuyerDifferentiation and FooterCTA. It must NOT be a footer link, sidebar item, or collapsed accordion (per AC-CP6.1). The baseline section 8 spec is otherwise unchanged.

---

### E2. Pricing Page (`/pricing`)

**WBS IDs:** 2.5.1, 2.5.2, 2.5.3
**Route:** `/pricing` (`pages/pricing.tsx`)
**ADRs:** ADR-012, ADR-013
**Purpose:** Dedicated tier-comparison surface. Accessible without auth. Shows Free / Pro ($19/mo) / Team ($49/mo). Displays USD and NGN pricing. CTA wiring is auth-aware and provider-aware.

#### E2.1 User flow

Visitor arrives at `/pricing` (from Nav link, upgrade CTA, or direct URL) -> Page renders statically (no auth required) -> Visitor evaluates tiers -> Clicks a CTA:

- **Free CTA:** Navigates to `/app`.
- **Pro/Team CTA (unauthenticated):** Routes to signup/login with `?intent=checkout&tier=pro&provider=stripe` (or paystack) preserved in URL. After auth, resumes at the provider-choice step.
- **Pro/Team CTA (authenticated):** Opens the provider-choice checkout step (inline on the pricing page or as a modal). User selects Stripe (USD) or Paystack (NGN). Selection triggers `POST /api/subscriptions/checkout { tier, provider }`. User is redirected to the chosen provider's hosted checkout.
- **Team CTA (before Team tier ships):** Shows "Contact us" text linking to the distribution contact destination. Not a dead checkout.

**Error exits:** Network error on checkout init -> inline error message with retry. Auth flow failure -> standard auth modal error handling (baseline section 2).

#### E2.2 Layout

```
+---------------------------------------------+
|  NAV                                          |
+---------------------------------------------+
|                                               |
|  PRICING                                      |
|  "Simple pricing. No surprises."              |
|                                               |
|  [Currency toggle: USD / NGN]                 |
|                                               |
|  +-------------+  +-------------+  +---------+|
|  | FREE        |  | PRO         |  | TEAM    ||
|  |             |  | RECOMMENDED |  |         ||
|  | $0/month    |  | $19/month   |  | $49/mo  ||
|  |             |  | NGN X/month |  | NGN X/mo||
|  |             |  |             |  |         ||
|  | * 3 plans   |  | * Unlimited |  | * 5 seat||
|  | * Watermark |  | * No wm     |  | * White ||
|  | * Standard  |  | * Priority  |  | * Batch ||
|  |             |  |             |  |         ||
|  | [Start free]|  | [Upgrade]   |  |[Contact]||
|  +-------------+  +-------------+  +---------+|
|                                               |
|  COMPARE FEATURES                             |
|  [Full feature comparison table]              |
|                                               |
+---------------------------------------------+
```

#### E2.3 Component hierarchy

- `PricingPage`
  - `Nav`
  - `PricingHeader`
    - `PageTitle` (h1, display font)
    - `PageSubtext` (p)
    - `CurrencyToggle` (switches display between USD and NGN)
  - `TierGrid` (3-column on desktop, stacked on mobile)
    - `TierCard` (repeated, 3 cards)
      - `TierName` (eyebrow)
      - `RecommendedBadge` (Pro only)
      - `PriceDisplay`
        - `PrimaryPrice` (USD amount)
        - `SecondaryPrice` (NGN amount, or "[TO CONFIRM]")
        - `PricePeriod` ("/month")
      - `FeatureList`
        - `FeatureItem` (repeated, with check/cross icon)
      - `TierCTA` (primary for Pro, secondary for Free and Team)
  - `FeatureComparisonTable` (full matrix below tier cards)
    - `TableHeader` (Free / Pro / Team columns)
    - `TableRow` (repeated per feature)
      - `FeatureName`
      - `FeatureValue` (check, cross, or text per tier)
  - `FAQSection` (optional, below comparison table)

#### E2.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| CurrencyToggle — active | `bg: var(--accent); color: #000; font-size: 0.8125rem; padding: 0.375rem 0.75rem; min-height: 36px` | -- | `outline: 2px solid var(--accent)` | -- | -- | -- | -- | -- |
| CurrencyToggle — inactive | `bg: var(--surface-2); color: var(--text-2); border: 1px solid var(--border)` | `color: var(--text); border-color: var(--border-strong)` | `outline: 2px solid var(--accent)` | -- | -- | -- | -- | -- |
| TierCard — Free | `bg: var(--surface-2); border: 1px solid var(--border); padding: 2rem` | `border-color: var(--accent-border)` | -- | -- | -- | -- | -- | -- |
| TierCard — Pro (recommended) | `bg: var(--pricing-recommended-bg); border: 2px solid var(--pricing-recommended-border); padding: 2rem` | `border-color: var(--accent)` | -- | -- | -- | -- | -- | -- |
| TierCard — Team | `bg: var(--surface-2); border: 1px solid var(--border); padding: 2rem` | `border-color: var(--accent-border)` | -- | -- | -- | -- | -- | -- |
| RecommendedBadge | `bg: var(--pro-badge-bg); border: 1px solid var(--pro-badge-border); color: var(--accent); font-family: var(--f-ui); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; padding: 0.25rem 0.5rem` | -- | -- | -- | -- | -- | -- | -- |
| TierName | `color: var(--text); font-family: var(--f-display); text-transform: uppercase; font-size: 1.25rem; letter-spacing: 0.06em` | -- | -- | -- | -- | -- | -- | -- |
| PrimaryPrice | `color: var(--text); font-family: var(--f-display); font-size: 2.5rem` | -- | -- | -- | -- | -- | -- | -- |
| SecondaryPrice | `color: var(--text-3); font-family: var(--f-ui); font-size: 0.875rem` | -- | -- | -- | -- | -- | -- | -- |
| SecondaryPrice — unconfirmed | `color: var(--text-3); font-style: italic` (shows "NGN pricing coming soon") | -- | -- | -- | -- | -- | -- | -- |
| PricePeriod | `color: var(--text-3); font-family: var(--f-ui); font-size: 0.875rem` | -- | -- | -- | -- | -- | -- | -- |
| FeatureItem — included | `color: var(--text-2); font-family: var(--f-ui); font-size: 0.875rem` | -- | -- | -- | -- | -- | -- | -- |
| FeatureItem — check icon | `color: var(--accent)` | -- | -- | -- | -- | -- | -- | -- |
| FeatureItem — cross icon | `color: var(--text-3); opacity: 0.5` | -- | -- | -- | -- | -- | -- | -- |
| TierCTA — Pro (primary) | `bg: var(--accent); color: #000; font-family: var(--f-display); text-transform: uppercase; letter-spacing: 0.04em; width: 100%; padding: 0.75rem 1.5rem; min-height: 48px` | `bg: var(--accent-hover)` | `outline: 2px solid var(--accent)` | `bg: var(--accent-hover)` | spinner + `opacity: 0.7` | -- | inline error text | -- |
| TierCTA — Free (secondary) | `bg: transparent; border: 1px solid var(--border-strong); color: var(--text); width: 100%; padding: 0.75rem 1.5rem; min-height: 48px` | `border-color: var(--accent-border); color: var(--accent)` | `outline: 2px solid var(--accent)` | -- | -- | -- | -- | -- |
| TierCTA — Team (contact) | same as Free secondary | same | same | -- | -- | -- | -- | -- |
| TierCTA — Team (before built) | same style as Free secondary but with "Contact us" text | same | same | -- | -- | -- | -- | -- |
| ComparisonTable header | `bg: var(--surface); border-bottom: 1px solid var(--border-strong); color: var(--text); font-family: var(--f-display); text-transform: uppercase; font-size: 0.875rem` | -- | -- | -- | -- | -- | -- | -- |
| ComparisonTable row | `border-bottom: 1px solid var(--border); padding: 0.75rem 0` | -- | -- | -- | -- | -- | -- | -- |
| ComparisonTable — Pro column | `bg: var(--pricing-recommended-bg)` (subtle highlight continues through table) | -- | -- | -- | -- | -- | -- | -- |

**Page-level states:**
- **Default (anonymous):** All tiers visible. Pro/Team CTAs show text that implies auth will be needed ("Get started" / "Upgrade to Pro"). No user-specific data on the page.
- **Default (authenticated, free):** Same layout. Pro/Team CTAs show "Upgrade to Pro" / "Upgrade to Team". No plan-count indicator on this page (that lives on /my-plans).
- **Default (authenticated, pro):** Pro card shows "Current plan" badge replacing the CTA. Team CTA shows "Upgrade to Team".
- **Default (authenticated, team):** Team card shows "Current plan" badge. Pro card CTA hidden or shows "Included in Team".
- **Loading (checkout init):** CTA shows spinner, button disabled, `opacity: 0.7`. Other CTAs remain interactive.
- **Error (checkout init failure):** Inline error text below the CTA: "Something went wrong. Please try again."

#### E2.5 CurrencyToggle detail

The toggle switches the displayed price between USD and NGN across all tier cards simultaneously. It does NOT change what currency the user will be charged -- that is determined by the provider selection at checkout.

**Layout:** A segmented control with two options: "USD" and "NGN". Positioned below the page subtitle, centered.

**Behavior:**
- Default: USD selected (Stripe prices shown as primary).
- When NGN selected: NGN amounts shown as primary price. If NGN amounts are `TO CONFIRM`, the price area shows "Coming soon" in the NGN column and the toggle still works (NGN option is not disabled).
- Toggle state is local (no persistence, no URL param).

**State table:**

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| Toggle container | `bg: var(--surface); border: 1px solid var(--border); display: inline-flex; gap: 0` | -- | -- | -- | -- | -- | -- | -- |
| Toggle option — selected | `bg: var(--accent); color: #000; font-weight: 600` | -- | `outline: 2px solid var(--accent)` | -- | -- | -- | -- | -- |
| Toggle option — unselected | `bg: transparent; color: var(--text-2)` | `color: var(--text)` | `outline: 2px solid var(--accent)` | -- | -- | -- | -- | -- |

**Accessibility:**
- `role="radiogroup"` on the container.
- Each option is `role="radio"` with `aria-checked`.
- Keyboard: arrow keys switch selection. Tab moves focus to/from the group.

#### E2.6 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| PageTitle | mount | opacity + translateY (14px -> 0) | 500ms | var(--ease-spring) |
| TierCard | mount (stagger) | opacity + translateY (18px -> 0) | 400ms, delay: index * 0.08s | var(--ease-spring) |
| RecommendedBadge | mount | opacity + scale (0.9 -> 1) | 300ms, delay: 0.3s | var(--ease-spring) |
| CurrencyToggle | switch | background-color | 150ms | ease-out |
| PrimaryPrice | currency switch | opacity (1 -> 0 -> 1) + translateY (4px) | 200ms | ease-out |
| ComparisonTable | in-view | opacity + translateY (12px -> 0) | 400ms | var(--ease-spring) |
| TierCTA | hover | background-color | 150ms | ease-out |

#### E2.7 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Tier cards stack vertically, full-width. Pro card (recommended) appears FIRST in the stack (visual priority). Padding: `1.5rem 1rem`. CTAs full-width. Comparison table scrolls horizontally with `overflow-x: auto`. Currency toggle centered above cards. |
| 640-1024px (tablet) | 3-column tier grid with reduced gap (`0.75rem`). Cards may shrink: reduce font sizes by 1 step. Comparison table fits without scroll. |
| > 1024px (desktop) | 3-column tier grid, gap `1.25rem`, max-width `1080px` centered. Padding: `3rem 2rem`. Pro column is slightly taller (extends above/below siblings by ~4px due to the 2px border vs 1px). |

#### E2.8 Token usage

- `--bg`, `--surface`, `--surface-2`, `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-border`, `--text`, `--text-2`, `--text-3`, `--pro-badge-bg`, `--pro-badge-border`, `--pricing-recommended-border`, `--pricing-recommended-bg`, `--error-text`.

#### E2.9 Accessibility notes

- **Heading:** Single `<h1>` "Pricing" on the page.
- **Tier cards:** Each card is a `<section>` or `<article>` with `aria-labelledby` pointing to the tier name.
- **Recommended badge:** `aria-label="Recommended plan"` on the badge element.
- **Feature list:** Uses `<ul>` with `<li>`. Check/cross icons have `aria-hidden="true"`; the feature name itself is the accessible content.
- **Comparison table:** Uses `<table>` with `<thead>`, `<tbody>`, `<th scope="col">` for tier names, `<th scope="row">` for feature names.
- **CurrencyToggle:** `role="radiogroup"` with `role="radio"` options (see E2.5).
- **Focus order:** Tab through: CurrencyToggle -> Free CTA -> Pro CTA -> Team CTA -> comparison table links.
- **WCAG:** 1.3.1 (tables), 1.4.3 (contrast), 2.1.1 (keyboard), 2.4.6 (headings), 4.1.2 (name, role, value on toggle).

#### E2.10 Copy and content

- **Page title (h1):** `Pricing`
- **Subtitle:** `Simple pricing. No surprises.`
- **Currency toggle labels:** `USD` / `NGN`

**Free tier card:**
- **Tier name:** `FREE`
- **Price:** `$0` / `Free forever`
- **Features:**
  - `Generate up to 3 plans`
  - `Save and revisit plans`
  - `Critique and investor questions`
  - `Export with Forge watermark`
  - `Standard generation speed`
- **CTA:** `Start free ->`

**Pro tier card:**
- **Tier name:** `PRO`
- **Badge:** `RECOMMENDED`
- **Price (USD):** `$19` / `per month`
- **Price (NGN):** `[TO CONFIRM]` / `per month` (or "Coming soon" if unconfirmed)
- **Features:**
  - `Unlimited plans`
  - `No watermark on exports`
  - `Priority generation speed`
  - `Everything in Free`
- **CTA:** `Upgrade to Pro ->`

**Team tier card:**
- **Tier name:** `TEAM`
- **Price (USD):** `$49` / `per month`
- **Price (NGN):** `[TO CONFIRM]` / `per month` (or "Coming soon" if unconfirmed)
- **Features:**
  - `Up to 5 seats`
  - `White-label exports (no Forge branding)`
  - `Batch generation (up to 10 plans)`
  - `Everything in Pro`
- **CTA (before Team ships):** `Contact us ->`
- **CTA (after Team ships):** `Upgrade to Team ->`

**Comparison table features (rows):**

| Feature | Free | Pro | Team |
|---|---|---|---|
| Plan generation | check | check | check |
| Critique + investor questions | check | check | check |
| Saved plans | `Up to 3` | `Unlimited` | `Unlimited` |
| Export (.docx / .pdf) | check | check | check |
| Watermark-free exports | cross | check | check |
| Priority generation | cross | check | check |
| White-label exports | cross | cross | check |
| Team seats | `1` | `1` | `Up to 5` |
| Batch generation | cross | cross | check |

- **Error text:** `Something went wrong. Please try again.`

#### E2.11 Open questions

- [Q-P7-RESOLVED] Team CTA before Team tier ships: shows "Contact us" linking to the distribution contact destination. This extension resolves Q-P7 as specified.
- [OD-1] NGN prices are `TO CONFIRM`. When the product owner confirms NGN amounts, update `lib/pricing.ts` and replace `[TO CONFIRM]` with the actual amounts. No code change to the pricing page component is needed -- it reads from config.

---

### E3. Provider-Selection Checkout Step

**WBS IDs:** 2.5.2, 2.5.3
**ADR:** ADR-013
**Purpose:** After a user clicks a paid-tier CTA (from `/pricing`, inline upgrade CTA, or "My plans" limit CTA), and after authentication (if needed), the user selects their payment provider: Stripe (USD) or Paystack (NGN). This selection determines the currency and the hosted checkout experience.

#### E3.1 User flow

User clicks paid-tier CTA -> (if unauthenticated: auth modal with `?intent=checkout&tier=X` preserved -> auth completes -> resume) -> **Provider-choice step appears** -> User selects Stripe or Paystack -> `POST /api/subscriptions/checkout { tier, provider }` -> Loading state on button -> Redirect to provider's hosted checkout (Stripe Checkout page or Paystack hosted page) -> (Payment completes on provider) -> Redirect back to `/app?success=1` -> Success state (see E4).

**Error exits:**
- Checkout init fails (network or server error) -> inline error with retry.
- User closes provider checkout without paying -> returns to Forge; no state change; can retry.

#### E3.2 Layout

The provider-choice step is rendered as a modal overlay (consistent with auth modal and email capture modal patterns). It appears after the user has been authenticated (or is already authenticated).

```
+---------------------------------------------+
|  BACKDROP (same as auth modal)                |
|                                               |
|     +-------------------------------+         |
|     |  CHOOSE YOUR PAYMENT METHOD   |         |
|     |                               |         |
|     |  Upgrading to PRO -- $19/mo   |         |
|     |                               |         |
|     |  +---------------------------+|         |
|     |  | [Stripe icon]             ||         |
|     |  | Pay with Stripe           ||         |
|     |  | Visa, Mastercard, etc.    ||         |
|     |  | Billed in USD             ||         |
|     |  +---------------------------+|         |
|     |                               |         |
|     |  +---------------------------+|         |
|     |  | [Paystack icon]           ||         |
|     |  | Pay with Paystack         ||         |
|     |  | Nigerian cards, bank, etc.||         |
|     |  | Billed in NGN             ||         |
|     |  | [Coming soon / disabled]  ||         |
|     |  +---------------------------+|         |
|     |                               |         |
|     |  [Continue to checkout ->]    |         |
|     |                               |         |
|     |  [x] Close                    |         |
|     +-------------------------------+         |
|                                               |
+---------------------------------------------+
```

#### E3.3 Component hierarchy

- `ProviderChoiceModal` (portal / fixed overlay)
  - `Backdrop` (same as email capture and auth modals)
  - `ModalCard` (motion.div)
    - `CloseButton` (icon-only, top-right)
    - `ModalTitle` (h2, display font)
    - `TierSummary` (text: "Upgrading to [TIER] -- $[AMOUNT]/mo")
    - `ProviderOptions` (radio group)
      - `ProviderCard` (Stripe)
        - `ProviderIcon` (Stripe logo or representative icon)
        - `ProviderName` ("Pay with Stripe")
        - `ProviderDescription` ("Visa, Mastercard, and more. Billed in USD.")
      - `ProviderCard` (Paystack)
        - `ProviderIcon` (Paystack logo or representative icon)
        - `ProviderName` ("Pay with Paystack")
        - `ProviderDescription` ("Nigerian cards, bank transfer, and more. Billed in NGN.")
        - `ComingSoonLabel` (conditional: shown when NGN prices are unconfirmed)
    - `ContinueButton` (primary CTA)
    - `ErrorMessage` (conditional)

#### E3.4 State table

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| Backdrop | `opacity: 0` (animates to 1 on mount) | -- | -- | -- | -- | -- | -- | -- |
| ModalCard | `opacity: 0; scale: 0.96` (animates to 1/1) | -- | -- | -- | -- | -- | -- | -- |
| ProviderCard — selected | `bg: var(--accent-bg); border: 2px solid var(--accent); padding: 1rem 1.25rem` | -- | `outline: 2px solid var(--accent)` | -- | -- | -- | -- | -- |
| ProviderCard — unselected | `bg: var(--surface-2); border: 1px solid var(--border); padding: 1rem 1.25rem` | `border-color: var(--accent-border)` | `outline: 2px solid var(--accent)` | -- | -- | -- | -- | -- |
| ProviderCard — disabled (NGN unconfirmed) | `bg: var(--surface-2); border: 1px solid var(--border); opacity: 0.5; cursor: not-allowed` | -- (no hover effect) | -- (not focusable) | -- | -- | -- | -- | `opacity: 0.5; pointer-events: none` |
| ProviderIcon — Stripe | `color: var(--provider-stripe-accent)` | -- | -- | -- | -- | -- | -- | -- |
| ProviderIcon — Paystack | `color: var(--provider-paystack-accent)` | -- | -- | -- | -- | -- | -- | same but `opacity: 0.5` |
| ProviderName | `color: var(--text); font-family: var(--f-ui); font-weight: 600; font-size: 0.9375rem` | -- | -- | -- | -- | -- | -- | `color: var(--text-3)` |
| ProviderDescription | `color: var(--text-2); font-family: var(--f-ui); font-size: 0.8125rem; margin-top: 0.25rem` | -- | -- | -- | -- | -- | -- | `color: var(--text-3)` |
| ComingSoonLabel | `color: var(--accent); font-family: var(--f-ui); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.375rem` | -- | -- | -- | -- | -- | -- | -- |
| ContinueButton | `bg: var(--accent); color: #000; width: 100%; padding: 0.75rem; min-height: 48px; font-family: var(--f-display); text-transform: uppercase; letter-spacing: 0.04em` | `bg: var(--accent-hover)` | `outline: 2px solid var(--accent)` | `bg: var(--accent-hover)` | spinner icon + `opacity: 0.7` + text changes to "Redirecting..." | -- | -- | `opacity: 0.3; cursor: default` (when no provider selected) |
| CloseButton | `color: var(--text-3)` | `color: var(--text)` | `outline: 2px solid var(--accent)` | -- | -- | -- | -- | -- |
| ErrorMessage | hidden | -- | -- | -- | -- | -- | visible: `color: var(--error-text); font-size: 0.8125rem; margin-top: 0.5rem` | -- |

**Modal-level states:**
- **Initial:** Stripe provider pre-selected (default). ContinueButton enabled.
- **Stripe selected:** Border highlights Stripe card. ContinueButton text: "Continue to checkout ->".
- **Paystack selected (NGN confirmed):** Border highlights Paystack card. ContinueButton text: "Continue to checkout ->".
- **Paystack unavailable (NGN unconfirmed):** Paystack card disabled. "Coming soon" label visible. Cannot be selected. Stripe remains selectable.
- **Submitting:** ContinueButton shows spinner + "Redirecting...". Both provider cards disabled. Close button still works.
- **Error:** ErrorMessage appears below ContinueButton. Provider cards re-enabled for retry.
- **Success:** Modal closes. Browser navigates to the provider's hosted checkout URL.

#### E3.5 Motion spec

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| Backdrop | mount | opacity (0 -> 1) | 200ms | ease-out |
| ModalCard | mount | opacity + scale (0 / 0.96 -> 1 / 1) | 250ms | var(--ease-spring) |
| ModalCard | unmount | opacity + scale (1 / 1 -> 0 / 0.96) | 200ms | var(--ease-out) |
| ProviderCard | selection change | border-color + background-color | 150ms | ease-out |
| ContinueButton | hover | background-color | 150ms | ease-out |
| ContinueButton | loading | opacity (1 -> 0.7) | 150ms | linear |
| ErrorMessage | appear | opacity + translateY (-4px -> 0) | 150ms | ease-out |

#### E3.6 Responsive rules

| Breakpoint | Layout change |
|---|---|
| < 640px (mobile) | Modal is full-width sheet at bottom of viewport (same pattern as email capture and auth modals). Provider cards stack vertically, full-width. Padding: `2rem 1.5rem`. ContinueButton full-width. |
| >= 640px (desktop) | Centered modal, `max-width: 480px`. Provider cards stack vertically (not side-by-side -- vertical scan is clearer for a binary choice). Padding: `2rem`. |

#### E3.7 Token usage

- `--bg`, `--surface-2`, `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-bg`, `--accent-border`, `--text`, `--text-2`, `--text-3`, `--modal-backdrop`, `--error-text`, `--provider-stripe-accent`, `--provider-paystack-accent`.

#### E3.8 Accessibility notes

- **Focus trap:** Same as auth modal. Focus moves to the first provider card (Stripe) on open. Tab cycles through: Stripe card -> Paystack card (if enabled) -> ContinueButton -> CloseButton -> Stripe card.
- **Escape:** Closes modal. Returns focus to the trigger element.
- **ARIA:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby="provider-modal-title"`.
- **Provider selection:** `role="radiogroup"` on the container. Each ProviderCard is `role="radio"` with `aria-checked`. Arrow keys switch selection. Disabled Paystack card has `aria-disabled="true"` and is skipped by arrow keys.
- **Screen reader:** Announce "Choose your payment method" on open. Announce "Stripe selected" / "Paystack selected" on change. Announce error messages.
- **WCAG:** 2.4.3 (focus order), 2.4.7 (focus visible), 1.4.3 (contrast -- provider accent colors on `--surface-2` are both >= 4.5:1), 2.1.1 (keyboard), 4.1.2 (name, role, value on radio group).

#### E3.9 Copy and content

- **Modal title:** `Choose your payment method`
- **Tier summary:** `Upgrading to [TIER] -- $[AMOUNT]/mo` (amount from `lib/pricing.ts`)
- **Stripe card:**
  - **Name:** `Pay with Stripe`
  - **Description:** `Visa, Mastercard, and more. Billed in USD.`
- **Paystack card:**
  - **Name:** `Pay with Paystack`
  - **Description:** `Nigerian cards, bank transfer, and more. Billed in NGN.`
  - **Coming soon label:** `NGN PRICING COMING SOON`
- **Continue button:** `Continue to checkout ->`
- **Continue button (loading):** `Redirecting...`
- **Error text:** `Something went wrong. Please try again.`
- **Close button aria-label:** `Close payment method dialog`

#### E3.10 Auth-then-checkout hop (unauthenticated flow)

When an unauthenticated user clicks a paid-tier CTA, the system must:
1. Open the auth modal (baseline section 2), defaulting to the "Sign up" tab.
2. Preserve the checkout intent in the URL or in-memory state: `{ tier, provider? }`.
3. After successful auth (signup or login), check for preserved intent.
4. If intent exists, automatically open the ProviderChoiceModal with the specified tier.
5. If the user had also pre-selected a provider (from `/pricing` CTA that specified one), pre-select that provider in the modal.

This is a UI flow orchestration concern, not a new component. The auth modal and provider-choice modal are separate components that appear sequentially.

**State management:**
- On the `/pricing` page: CTA click sets `sessionStorage` key `forge:checkout_intent` = `{ tier: "pro"|"team", provider?: "stripe"|"paystack" }`.
- Auth modal on success checks for this key. If present, opens ProviderChoiceModal.
- After checkout redirect (success or cancel), the key is cleared.

#### E3.11 Open questions

- None. Provider choice is locked per ADR-013 (Option B, user-selected). NGN gating is specified (disabled until confirmed).

---

### E4. Post-Checkout Success State (reconciliation)

**WBS ID:** 2.4.2
**Purpose:** After successful payment via either provider, the user is redirected to `/app?success=1`. This section specifies the success toast and the immediate UI changes.

**Reconciliation with baseline section 5 (Upgrade CTA) and section 6 (Pro Badge):** Those sections specify the Upgrade CTA and the Pro badge. This extension specifies only the transient success state that bridges checkout completion to the ongoing Pro experience.

#### E4.1 User flow

Provider checkout completes -> User redirected to `/app?success=1` -> Success toast appears -> Pro badge visible in Nav -> Upgrade CTA hidden -> Plan limit removed -> Watermark removed from future exports -> Toast auto-dismisses after 5 seconds.

#### E4.2 Success toast

```
+---------------------------------------------+
|  [check icon]  You're on Pro!                |
|  Unlimited plans unlocked.                   |
|                            [auto-dismiss 5s] |
+---------------------------------------------+
```

**Position:** Fixed, top-center of viewport, below Nav. `z-index` above page content, below modals.

**State table:**

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| Toast container | `bg: var(--surface-2); border: 1px solid var(--success-text); color: var(--text); font-family: var(--f-ui); padding: 1rem 1.5rem; max-width: 400px; width: calc(100% - 2rem)` | -- | -- | -- | -- | -- | -- | -- |
| Check icon | `color: var(--success-text)` | -- | -- | -- | -- | -- | -- | -- |
| Toast title | `color: var(--text); font-weight: 600; font-size: 0.9375rem` | -- | -- | -- | -- | -- | -- | -- |
| Toast body | `color: var(--text-2); font-size: 0.8125rem` | -- | -- | -- | -- | -- | -- | -- |

**Motion spec:**

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| Toast | mount | opacity + translateY (-16px -> 0) | 400ms | var(--ease-spring) |
| Toast | auto-dismiss (5s) | opacity + translateY (0 -> -16px) | 300ms | var(--ease-out) |

**Copy:**
- **Title:** `You're on Pro!`
- **Body:** `Unlimited plans unlocked.`

For Team tier: **Title:** `You're on Team!` **Body:** `5 seats and white-label exports unlocked.`

**Accessibility:**
- `role="status"`, `aria-live="polite"` on the toast so screen readers announce it.
- Toast does not trap focus. It is informational only.
- WCAG 4.1.3 (status messages).

**CSS class convention:** `.success-toast` must be added to the Lamborghini `border-radius: 0 !important` override block.

---

### E5. Auto-Save-on-Signup Messaging (reconciliation with ADR-009)

**WBS ID:** 2.1.2, 2.3.2
**Purpose:** ADR-009 supersedes ADR-008. When an anonymous user signs up after generating a plan, the plan is auto-saved to their new account. This section specifies the UI messaging around that auto-save -- NOT the auto-save mechanism itself (which is backend).

**Reconciliation with baseline section 4 (Free-Account Prompt Banner):** Section 4 specifies the prompt banner and its variants. This extension adds ONE delta: the post-signup confirmation message acknowledging that the plan was saved.

#### E5.1 Post-signup confirmation (auto-save acknowledgment)

After the auth modal closes on successful signup (with a plan auto-saved), show an inline confirmation below the ActionStack (or as a brief toast):

**Inline confirmation variant (preferred -- less transient than a toast):**

```
+---------------------------------------------+
|  [check icon]  Plan saved to your account.    |
|  View it anytime in My Plans.                |
+---------------------------------------------+
```

**State table:**

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| Confirmation banner | `bg: var(--success-bg); border: 1px solid rgba(74, 222, 128, 0.3); color: var(--text); padding: 0.75rem 1rem; margin-top: 1rem` | -- | -- | -- | -- | -- | -- | -- |
| Check icon | `color: var(--success-text)` | -- | -- | -- | -- | -- | -- | -- |
| "My Plans" link | `color: var(--accent); text-decoration: underline` | `color: var(--accent-text)` | `outline: 2px solid var(--accent)` | -- | -- | -- | -- | -- |

**Motion spec:**

| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| Confirmation banner | mount | opacity + translateY (8px -> 0) | 350ms | var(--ease-spring) |

**Copy:**
- **Text:** `Plan saved to your account.`
- **Link:** `View it anytime in My Plans.` ("My Plans" is a link to `/my-plans`)

**When NOT to show:**
- Signup without a generated plan (user came from `/pricing` directly) -- no confirmation needed.
- Signup with an invalid plan (backend skipped the plan) -- no confirmation. The user simply has an account.
- Login (returning user) -- no confirmation. Auto-save only fires on signup.

**Accessibility:**
- `role="status"`, `aria-live="polite"`.
- Link within the banner is keyboard-focusable.
- WCAG 4.1.3 (status messages).

**CSS class convention:** `.auto-save-confirm` must be added to the Lamborghini `border-radius: 0 !important` override block.

---

### E6. Watermark Removed State (reconciliation with baseline section 6)

**WBS IDs:** 1.4.2, 1.4.3 (backend), 2.4.1 (frontend)
**Purpose:** Baseline section 6 specifies the watermark indicator for free users. This extension specifies the ABSENCE of the watermark for paid users and the referral attribution URL addition (ADR-011).

#### E6.1 Watermark states by tier

| Tier | Export watermark | Watermark text | Referral URL |
|---|---|---|---|
| Anonymous (lead) | Present | `Generated with Forge -- [PUBLIC_BASE_URL]?ref=export` | Yes |
| Free | Present | `Generated with Forge -- [PUBLIC_BASE_URL]?ref=export` | Yes |
| Pro | Absent | -- | -- |
| Team | Absent | -- | -- |

#### E6.2 Watermark-removed UI indicator (Pro/Team exports)

When a Pro or Team user clicks Download, the export proceeds immediately (no email gate per baseline section 1, AC-A2.8). There is NO visible watermark indicator in the UI for Pro/Team users. The absence of the watermark is the benefit -- it does not need a callout.

**However:** On the `/my-plans` page and in the ActionStack, if the user is on Pro/Team, the "No watermark" benefit can be communicated as a subtle inline note near the download buttons:

```
+---------------------------------------------+
|  [Download .docx]  [Download .pdf]            |
|  Clean export -- no watermark                 |
+---------------------------------------------+
```

| Element | Default | Hover | Focus | Active | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|---|
| "Clean export" note | `color: var(--text-3); font-family: var(--f-ui); font-size: 0.75rem; margin-top: 0.375rem` | -- | -- | -- | -- | -- | -- | -- |

This is an informational line, not interactive. Visible only for Pro/Team users.

#### E6.3 Referral URL delta (ADR-011)

The watermark URL now includes `?ref=export`. This is a backend change (see WBS 1.4.1-1.4.3). The frontend impact is:

- Landing page (`pages/index.tsx`) reads `?ref=export` from the URL query string on mount.
- If present, fires an analytics event `referral_source = "export_watermark"` (or queues it if the analytics pipeline is not yet live).
- Optionally persists `ref=export` in `sessionStorage` for first-touch attribution.
- The parameter does NOT affect page rendering, layout, or content.

No additional UI elements are needed for referral capture.

---

### E7. Cross-Cutting Concerns (Extension)

#### E7.1 CSS class additions to Lamborghini override block

All new component root classes introduced in this extension must be added to the `border-radius: 0 !important` override block in `styles/globals.css`:

```
.hero-canvas, .social-proof-card, .buyer-diff-card, .pricing-tier-card,
.pricing-table, .currency-toggle, .provider-choice-modal, .provider-card,
.success-toast, .auto-save-confirm {
    border-radius: 0 !important;
}
```

#### E7.2 Animation defaults for new components

Same as baseline section 11.2: `framer-motion` v12, default transition `{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }`. The three.js/GSAP scene is the ONLY exception -- it uses GSAP timelines scoped to the WebGL canvas. GSAP and framer-motion must NOT animate the same DOM nodes (per ADR-010).

#### E7.3 Accessibility checklist (WCAG 2.2 AA) -- Extension

| Criterion | Status | Implementation notes |
|---|---|---|
| 1.1.1 Non-text Content | Pass | three.js canvas is `aria-hidden`. Provider icons have `aria-label`. Check/cross icons in pricing table are `aria-hidden` with text alternatives. |
| 1.3.1 Info and Relationships | Pass | Pricing comparison uses `<table>` with proper `<th>` scope. Radio groups use `role="radiogroup"` / `role="radio"`. Blockquotes in social proof. |
| 1.4.1 Use of Color | Pass | Provider selection uses text labels ("Pay with Stripe") not just color. Tier recommendation uses text badge ("RECOMMENDED") not just border color. |
| 1.4.3 Contrast (Minimum) | Pass | `--provider-stripe-accent` (#635bff) on `--surface-2` (#202020): ~4.7:1 (passes for UI components >=3:1). `--provider-paystack-accent` (#00c3f7) on `--surface-2`: ~7.2:1. `--success-text` (#4ade80) on `--bg` (#000000): ~8:1. `--pricing-recommended-border` on `--bg`: ~10:1. All body text passes per baseline section 11.3. |
| 1.4.10 Reflow | Pass | All new layouts reflow to single column at 320px. Pricing comparison table has `overflow-x: auto` on mobile. |
| 1.4.11 Non-text Contrast | Pass | Provider card borders in selected state (`--accent`, ~12:1 on black) pass. Currency toggle borders pass. |
| 1.4.13 Content on Hover | Pass | No hover-dependent content in new components. |
| 2.1.1 Keyboard | Pass | Currency toggle navigable with arrow keys. Provider choice navigable with arrow keys. All CTAs keyboard-operable. |
| 2.3.1 Three Flashes | Pass | three.js scene uses subtle particle drift, no flashing. Canvas intensity is low (~30% particle opacity). |
| 2.3.3 Animation from Interactions | Pass | `prefers-reduced-motion: reduce` disables three.js scene entirely, disables GSAP timelines, and zeroes framer-motion transitions per baseline. |
| 2.4.3 Focus Order | Pass | Provider modal traps focus. Tab order is logical. |
| 2.4.6 Headings and Labels | Pass | Single `<h1>` on pricing page. Proper heading hierarchy in all sections. |
| 2.4.7 Focus Visible | Pass | All focusable elements have `outline: 2px solid var(--accent)` or equivalent. |
| 2.5.8 Target Size (Minimum) | Pass | All buttons >= 48px height on mobile. Currency toggle options >= 36px height (with the container >= 44px total). Provider cards are large touch targets (~80px+ height). |
| 3.2.1 On Focus | Pass | No context change on focus. |
| 3.3.1 Error Identification | Pass | Checkout errors shown inline below CTA. |
| 4.1.2 Name, Role, Value | Pass | Currency toggle has `role="radiogroup"`/`role="radio"`. Provider choice has same. Disabled states use `aria-disabled`. |
| 4.1.3 Status Messages | Pass | Success toast uses `aria-live="polite"`. Auto-save confirmation uses `role="status"`. |

**Criteria not fully verifiable in spec (requires implementation verification):**
- 1.4.3 for provider accent colors on ALL possible backgrounds (verified for `--surface-2` only; implementation must check if cards appear on other backgrounds).
- 2.5.8 for the pricing comparison table cells on mobile (must verify touch targets in horizontal-scroll context).

#### E7.4 Dark mode notes (extension)

Same as baseline section 11.4: dark-first, no light mode. All new components use the existing dark token set. No additional dark-mode treatment needed.

---

### E8. Summary of Extension Decisions

#### E8.1 Reconciliation index

| Baseline section | What this extension does |
|---|---|
| Section 0 (tokens) | Proposes 6 new tokens in E0. |
| Section 4 (Free-Account Prompt) | E5 adds the auto-save acknowledgment message (ADR-009 delta). No change to the prompt banner itself. |
| Section 5 (Upgrade CTA) | E3 adds the provider-choice modal between CTA click and checkout redirect. The Upgrade CTA copy and layout from section 5 are unchanged. |
| Section 6 (Pro Badge / Tier-Aware UI) | E6 adds the "Clean export" watermark-removed note and the referral URL spec. E1.6 adds the Pricing nav link. |
| Section 7 (Hero Rewrite) | E1.4 SUPERSEDES section 7's sub-headline and CTA copy with the conversion-playbook-mandated versions. All other section 7 specs (states, motion, responsive) remain valid. |
| Section 8 (Distribution Hooks) | E1.10 adds the positioning constraint (above footer, not buried). Section 8's spec is otherwise unchanged. |
| Section 9 (Demo Scenario Tabs) | Unchanged. DemoPreviewStrip content update is a content task (WBS 2.6.5), not a structural change. |
| Section 10 (Password Reset) | Unchanged. |
| Section 11 (Cross-Cutting) | E7 extends the CSS override list, accessibility checklist, and animation defaults. |

#### E8.2 Q-P1 resolution

Q-P1 ("What happens to the LockedDecisions section?") is RESOLVED in this extension: rewritten as buyer-facing differentiation (E1.8). Two stale cards removed. Four cards reframed.

#### E8.3 Proposed new tokens (complete list for this extension)

| Token | Value | Rationale |
|---|---|---|
| `--success-text` | `#4ade80` | Success state text color |
| `--success-bg` | `rgba(74, 222, 128, 0.08)` | Success state background |
| `--provider-stripe-accent` | `#635bff` | Stripe brand identity in provider choice |
| `--provider-paystack-accent` | `#00c3f7` | Paystack brand identity in provider choice |
| `--pricing-recommended-border` | `rgba(255, 192, 0, 0.7)` | Recommended tier visual emphasis |
| `--pricing-recommended-bg` | `rgba(255, 192, 0, 0.04)` | Recommended tier subtle background |

#### E8.4 Open questions (extension)

| # | Question | Blocking? | Affected components |
|---|---|---|---|
| OD-1 | NGN prices for Pro and Team tiers. Product owner must confirm before Paystack CTA is enabled. | Yes -- blocks Paystack checkout path (E3 ProviderCard for Paystack). Does NOT block Stripe path or /pricing page rendering. | E2 (pricing page), E3 (provider choice) |
| OD-3 | Which demo scenario replaces childcare? Blocks DemoPreviewStrip content update (WBS 2.6.5). | No -- does not block any component design in this extension. Content-only task. | E1.2 (DemoPreviewStrip content) |
| OD-5 | Contact destination for distribution hooks (typeform, Calendly, emailto). Must be live before Team "Contact us" CTA ships. | Yes -- blocks Team CTA from being a live link. | E2 (Team CTA), section 8 (distribution hooks) |
| OD-8 | Beta user quotes for social proof block. | No -- fallback copy specified (E1.7). Block ships with fallback content. | E1.7 (SocialProofBlock) |

---

*End of Conversion Playbook Extension. This extension is part of the living Design Specification. Read alongside sections 0-12 (baseline, dated 2026-06-11). When open dependencies are resolved, update the affected sections in both the baseline and this extension.*
