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

*End of Design Specification. This document is a living spec. Update when open questions are resolved, tokens are approved, or implementation reveals new states.*
