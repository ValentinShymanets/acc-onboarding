# training-sessions: UI Implementation Plan ("Calm operational" restyle)

Sources of truth, in priority order:

1. `tasks/training-sessions/ui-design.md`. It wins every visual, layout, focus and a11y question.
2. `tasks/training-sessions/requirements.md`. Behavior and acceptance criteria must not change.
3. `tasks/training-sessions/implementation-plan.md`. It predates the design, so its markup is replaced here. Its data, mock, client, validation and test-tooling decisions stay as they are.

Application Root: the repository root, which is the only frontend app (Vite 8, React 19, TypeScript 6, npm).

## Current Behavior

- `src/App.tsx` renders `<main><h1>Training sessions</h1><SessionsWorkspace /></main>`. It does not import `App.css`, and nothing else does either, so the whole `App.css` file (`#center`, `.hero`, `#next-steps`, `.counter`, and so on) is dead.
- `src/index.css` is still the Vite starter: purple `--accent`, 18px root font, `#root` at 1126px with `text-align: center` and side borders, a 56px `h1`, a 24px `h2`, `code`/`.counter` and `#social` rules. Its colors come from a `:root` block plus a `prefers-color-scheme: dark` block.
- `SessionsWorkspace.tsx` returns a bare `<p>Loading sessions…</p>` while loading. On error it returns `<div role="alert">` with text and **Retry**. When ready it returns `<section>`, which holds a wrapping `<label>Status <select>`, a **New session** button that is always visible (even while the form is open), the form when open, and `SessionList`. Nothing manages focus.
- `CreateSessionForm.tsx` has labelled inputs wired with `aria-invalid`/`aria-describedby` and a `role="alert"` form error above the submit button. The submit button is disabled while pending, but its label stays "Create session". There is no card, no `h2`, and no focus management.
- `SessionList.tsx` renders `<p>No sessions</p>` or a `<ul>` whose `<li>` items contain `title · status · date` with literal `·` separators.
- Tests: `src/features/sessions/SessionsWorkspace.test.tsx` has 3 tests (filter, create, pending guard). Vitest uses jsdom. Vitest does not process CSS by default, so jsdom sees no stylesheet rules.

## Intended Behavior

The behavior stays exactly as specified in `requirements.md`. The visual and interaction layer is replaced to match `ui-design.md`:

- a 720px single column with the page in `surface-page` and cards in `surface-card`
- a header row that holds the `h1` and **New session**. The button is shown only when the list is ready and the form is closed.
- a toolbar with the Status FormField
- an inline form card with an `h2` "New session"
- a list card that holds the rows, empty, loading or error state
- status Badges
- light/dark tokens
- one 600px breakpoint
- focus moves at four points: form open, invalid submit, create success and retry success. The create-error case is handled as described below.
- "Creating…" as the pending label
- a visually hidden "Session created" status announcement

## Preconditions And Confirmed Decisions

- Visual direction "Calm operational" was accepted on 2026-10-21 (`workflow-log.md`, 16:00 row).
- The three unresolved decisions in `ui-design.md` stay at their defaults: no Cancel button, no scroll or highlight for a new row, lowercase status words. See the Open Questions below, especially Q1.
- No new dependencies. This plan uses plain CSS files imported from TSX, which Vite already supports. It uses no CSS Modules, no CSS-in-JS and no UI library.
- Planning decisions this plan makes, because the design leaves them to the implementer:

| Decision | Choice | Reason |
| --- | --- | --- |
| Where primitives live | `src/features/sessions/ui/` | The design says "local to `src/features/sessions/`, don't extract to a shared folder". |
| CSS organisation | Tokens and base rules go in `src/index.css`. Each component gets a co-located `.css` file imported by its `.tsx`. Classes are global with a component prefix (`btn`, `badge`, `card`, `field`, `sessions-`, `session-row`, `session-form`). | This is plain CSS with no new tooling, and it is clear who owns each rule. |
| Breakpoint expression | The base styles are for <600px. `@media (min-width: 600px)` adds the wider layout. `600px` is written as a literal, because custom properties don't work inside media queries. | One breakpoint, mobile-first, and it matches the design's "<600 / ≥600" split exactly. |
| Motion | No transitions anywhere. | The design allows at most 100ms. Using none means `prefers-reduced-motion` is satisfied with no extra rule. |
| Keeping the pending width | The create-session submit button gets a CSS `min-inline-size` that is at least the natural width of "Create session". The value is confirmed in the browser. | "Creating…" is shorter than "Create session". This needs no JS and no hidden duplicate label, which would pollute the accessible name in jsdom, where CSS is not loaded. |
| Primary text in dark mode | A new token `--on-accent`: `#ffffff` light, `#0f172a` dark. | The design names it "`text-strong-dark`" at 7.0:1. Only `#0f172a` on `#60a5fa` gives 7.0:1; the dark `text-strong` (`#f1f5f9`) would give about 2.4:1. Confirm in Q2. |
| Focus on create error | After a failure, explicitly focus the submit button once it is re-enabled. | The design says "focus stays on the submit button". A focused button that becomes `disabled` loses focus in browsers, and a submit made with Enter starts in Title, so focus has to be placed explicitly. |
| Clearing the "Session created" announcement | Clear it when **New session** is clicked, not in an effect. | That click lets the next success announce again. It also avoids `react-hooks/set-state-in-effect` (eslint-plugin-react-hooks v7). |
| Moving the `h1` | Move the `h1` from `App.tsx` into `SessionsWorkspace` (in the header row). `App.tsx` keeps `<main>`. | The header row needs the `h1` and the state-dependent **New session** button side by side, and that state lives in the workspace. It also stays one `h1`. |

## 1. Gap Table

| # | ui-design.md item | Current state in code | Change needed |
| --- | --- | --- | --- |
| G1 | Content max 720px, centered; gutter 16px (<600) / 24px (≥600); 32px top padding | `#root` is 1126px with borders and no gutter rules | Delete the `#root` block. Add a `.page` class on `<main>` in `App.tsx` that sets max 720px, `margin-inline: auto`, the gutter and the 32px top padding. |
| G2 | Left-aligned text, no centered text | `#root { text-align: center }` | This goes away when the `#root` block is deleted. There is no replacement rule, because start alignment is the default. |
| G3 | 24px vertical rhythm between header, toolbar, form card and list card | No layout | `.sessions` wrapper: flex column, `gap: var(--space-6)`. |
| G4 | Page `surface-page`, cards `surface-card` | `--bg: #fff` and purple tokens | Set the new tokens (section 2). `body { background: var(--surface-page) }`. |
| G5 | Header row: `h1` left, **New session** right on the same baseline; the button wraps full width below 600px | The `h1` is in `App.tsx`. The button is in `<section>` after the select. | Add `.sessions-header` to `SessionsWorkspace`. Below 600px the button is 100% wide; at 600px and up the row is a flex row with `align-items: baseline` and `justify-content: space-between`. |
| G6 | **New session** only in Ready | It is only in Ready already (the loading and error branches return early) | Keep this. The header still renders in loading and error, but without the button. |
| G7 | **New session** hidden while the form is open | It is always visible in Ready | Render it only when `load.status === 'ready' && !isFormOpen`. |
| G8 | Toolbar: Status FormField with a native select about 200px wide (full width below 600px), Ready only | A wrapping `<label>` with no width rules | Use `FormField label="Status"` inside `.sessions-toolbar`. The select is 100% wide below 600px and `inline-size: 200px` at 600px and up. It renders in Ready only, as now. |
| G9 | Create form card, inline between toolbar and list, `h2` "New session" | A bare `<form>` placed after the button | `CreateSessionForm` renders `Card` containing `<h2>New session</h2>` and the `<form>`. The workspace places it between the toolbar and the list card. |
| G10 | List card with no inner padding; rows supply padding | No card | Wrap the rows, empty, loading and error states in `Card padded={false}` (`.sessions-list-card`). |
| G11 | Button primitive (primary/secondary, sizes, hover, focus ring, disabled/pending) | Native unstyled buttons | Add `ui/Button.tsx` and `Button.css` (section 3). |
| G12 | Badge primitive (pill, 13px/500, lowercase word, per-status colors, light/dark) | `<span>{status}</span>` | Add `ui/Badge.tsx` and `Badge.css`. Use it in `SessionList`. |
| G13 | Card primitive (1px `border-subtle`, 8px radius, no shadow, 16px / 24px padding) | None | Add `ui/Card.tsx` and `Card.css`. |
| G14 | FormField primitive (label → control → error; 14px/500 label 4px above; control 40/44px high, 6px radius, `border-strong`, 16px text; error 14px `danger`, 4px below, `aria-describedby`; `aria-invalid` + `danger` border; fields 16px apart) | The wiring exists inline in `CreateSessionForm`. There is no styling, and the Status select is wrapped in its label. | Add `ui/FormField.tsx` and `FormField.css`. Use it for Title, Start date and time, and Status. The `.session-form` fields stack with `gap: var(--space-4)`. |
| G15 | Session row: three columns at 600px and up (title fills · badge auto · start right-aligned, tabular numbers); two lines below 600px; 12×16px padding; dividers between rows only | Inline text with `·` | `SessionList` renders `<li class="session-row">` containing title, `Badge` and start `<span>`s. CSS grid: two lines below 600px; `1fr auto auto` at 600px and up. Dividers use `.session-row + .session-row { border-top }`. |
| G16 | Remove the `·` separators | Present in the markup | Delete them from `SessionList.tsx`. |
| G17 | Row title 16px/500 `text-strong`, wraps and never truncates; start 14px `text-muted` with `toLocaleString()` and no fixed width | No styles | Apply them in `SessionList.css`. Use `overflow-wrap: anywhere` on the title and start so there is no horizontal scroll at 320px. Keep `new Date(startsAt).toLocaleString()` unchanged. |
| G18 | Rows are not interactive (no hover, cursor or focus stop) | Not interactive already | No change. Do not add `tabindex` or hover rules. |
| G19 | **Loading**: header without the button; list card shows "Loading sessions…" in `text-muted` with 24px padding and `role="status"`; no filter, no spinner | A bare `<p>` with no role and no card | The loading branch renders the header and a list card containing `<p role="status" class="sessions-message">Loading sessions…</p>`. |
| G20 | **List error**: header; list card holds a `danger-bg` band with "Couldn't load sessions." (`text-strong`, 500) and a secondary **Retry** beside it (below it under 600px); `role="alert"` on the band; no filter | `<div role="alert">` with no card and no style | The error branch renders the header and a list card containing `<div role="alert" class="sessions-band">`, which holds the text and `<Button variant="secondary" type="button">Retry</Button>`. The band wraps with flex: column below 600px, row at 600px and up. |
| G21 | **Retry success**: focus moves to the Status select | No focus handling | Set the ref flag `focusStatusOnReady` in `handleRetry`. An effect on `load.status` focuses `statusRef` when the status is `ready` and the flag is set, then clears the flag. |
| G22 | **Ready, empty**: toolbar visible; "No sessions" in `text-muted`, 24px padding, centered in the card | `<p>No sessions</p>` | `SessionList` renders `<p class="sessions-message sessions-message--center">No sessions</p>`. The toolbar is already rendered in Ready. |
| G23 | **Form open**: focus moves to the Title input | No focus | In `CreateSessionForm`, a mount effect focuses `titleRef`. |
| G24 | **Validation error**: errors on submit only, under each field, kept until the next submit, values kept; focus goes to the first invalid field | Errors are on submit and kept until the next submit (they are not cleared on input). No focus. | Keep the error logic. After validation fails, focus `titleRef` if there is a title error, otherwise focus `startsAtRef`. Errors render through FormField. |
| G25 | **Create pending**: the button reads "Creating…" and is disabled; inputs stay editable; second submit ignored; no width shift | Disabled, but the label is unchanged. The `inFlight` ref guard exists. Inputs stay editable. | `<Button type="submit" pending={isPending} pendingLabel="Creating…">Create session</Button>`. Give `.session-form__submit` a `min-inline-size`. Keep the `inFlight` guard unchanged. |
| G26 | **Create error**: `danger-bg` band at the bottom of the form, above submit; "Couldn't create the session. Try again."; `role="alert"`; values kept; list unchanged; focus on submit | `<p role="alert">` above submit with no styles. No focus handling. | Render `<p role="alert" class="session-form__band">` in the same position. Add a `submitRef`. An effect on `formError` focuses it when the error is set. The submit flow resets the error to `null` before each attempt, so a repeated failure fires the effect again. |
| G27 | **Create success**: form closes, filter `All`, row visible; focus returns to **New session**; a visually hidden `role="status"` announces "Session created" | Form closes, filter resets, row appended. No focus, no announcement. | In `handleCreated`, set the `focusNewSessionOnClose` ref flag and set `announcement` state to "Session created". An effect on `isFormOpen` focuses `newSessionRef` when the form is closed and the flag is set. The Ready branch always renders `<p role="status" class="visually-hidden">{announcement}</p>`, so the live region exists before its text changes. |
| G28 | Responsive: one 600px breakpoint; 44px controls and buttons below 600px; full-width header button, select and submit below 600px; no horizontal scroll at 320px | Starter breakpoints at 1024px | Remove the 1024px rules. Base styles: 44px heights and full-width blocks. `@media (min-width: 600px)`: 40px heights and the auto/200px widths. |
| G29 | Focus-visible: 2px `focus-ring` outline with 2px offset; never remove an outline without a replacement | Browser default | `.btn:focus-visible` and `.field__control:focus-visible` get the outline. The design defines the ring for Button; the a11y checklist asks for visible rings everywhere, so controls use the same ring. Never set `outline: none` without this rule. |
| G30 | Tab order: New session → Status → (form fields → Create session) → nothing in rows | DOM order is select → button → form | The new DOM order follows the regions: header button → toolbar select → form → list. |
| G31 | One `h1`; form `h2`; `<main>` landmark | The `h1` is in App and there is no `h2` | Move the `h1` into the workspace header (one `h1` in total). Add the `h2` in the form card. `<main>` stays in `App.tsx`. |
| G32 | `role="alert"` only for the list error and create error; `role="status"` for loading and success | Alert is used correctly, but loading has no role | Covered by G19, G20, G26 and G27. |
| G33 | Typography: base 16px; `h1` 24/600; `h2` 18/600; label 14/500; meta/error 14/400; badge 13/500 | Root font 18px/145% with 0.18px letter-spacing; `h1` 56px; `h2` 24px/500 | `index.css`: `:root` font `16px/1.5 var(--sans)` with no letter-spacing. `h1`, `h2`: `color: var(--text-strong)`, weight 600, `margin: 0`, sizes 24px and 18px, no responsive overrides. |
| G34 | Color tokens, light and dark | Starter tokens | Replace them (section 2). |
| G35 | Dark mode through `prefers-color-scheme`; `color-scheme: light dark` kept | Present | Keep `color-scheme: light dark` and the dark media query. Swap the values inside. |
| G36 | Messages "Title must be 3–80 characters." and "Choose a future date and time." | Already in `validateSessionForm.ts` | No change. |
| G37 | Create actions row: primary "Create session" on the left, full width below 600px; Enter in Title submits | A native submit button. Enter already submits. | `.session-form__actions`. The submit is 100% wide below 600px and `auto` at 600px and up. |

## 2. Token Strategy

All tokens are CSS custom properties in `src/index.css`, the only global stylesheet. `src/main.tsx` already imports it. No other file defines tokens; component CSS files only read them.

**`:root` (light) defines:**

- Colors, using the design names with a `--` prefix:
  - `--surface-page`, `--surface-card`, `--border-subtle`, `--border-strong`
  - `--text-strong`, `--text`, `--text-muted`
  - `--accent`, `--accent-hover`, `--on-accent` (new; see Q2), `--focus-ring`
  - `--danger`, `--danger-bg`
- Status colors, so the Badge mapping lives in one place:
  - `--status-scheduled-fg` and `--status-scheduled-bg`
  - `--status-completed-fg` and `--status-completed-bg`
  - `--status-cancelled-fg` and `--status-cancelled-bg`
  - The values come from the design's Badge table.
- Spacing: `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-6` 24px, `--space-8` 32px. These are the design's scale. The names follow multiples of 4.
- Radii: `--radius-control` 6px, `--radius-card` 8px, `--radius-pill` 999px.
- Sizes: `--control-height` 44px in the base, overridden to 40px inside `@media (min-width: 600px)`. Buttons and controls both read it.
- Font: keep `--sans` (the system stack already there). Root font: `16px/1.5 var(--sans)`, `color: var(--text)`, `background: var(--surface-page)`, `color-scheme: light dark`. Keep `font-synthesis`, `text-rendering` and font smoothing.

**`@media (prefers-color-scheme: dark) { :root { … } }`** overrides only the color and status tokens with the design's dark values. `--on-accent` becomes `#0f172a`.

**Base rules left in `index.css`:**

- `body { margin: 0 }`, plus `background: var(--surface-page)` so the whole viewport is painted.
- `h1`, `h2`: `margin: 0`, weight 600, `color: var(--text-strong)`, `line-height: 1.25`, sizes 24px and 18px. There are no media overrides.
- `p { margin: 0 }`. Keep this; it is harmless and the layout relies on it.
- `.page`: the page shell for `<main>` (G1).
- `.visually-hidden`: the standard clip pattern (absolute, 1px, `clip-path: inset(50%)`, `white-space: nowrap`, `overflow: hidden`).

**How the starter rules are removed (all in `src/index.css`):**

- `#root { … }`: delete the whole block (1126px width, `text-align: center`, `border-inline`, flex column, `min-height`). The `#root` element in `index.html` stays, unstyled.
- The starter `h1`/`h2` blocks (56px/36px and 24px/20px sizes, -1.68px letter-spacing, 1024px media rules, `--heading` font): replace them with the base rules above.
- Starter tokens `--text-h`, `--bg`, `--border`, `--code-bg`, `--accent-bg`, `--accent-border`, `--social-bg`, `--shadow`, `--heading`, `--mono`: delete them, in both light and dark. `--text` and `--accent` are kept by name but get the design values.
- `code, .counter`, `code`, `#social .button-icon`, and the `:root` 1024px font-size media rule: delete them. Nothing in `src/` uses them.
- "center": the centering comes from `#root { text-align: center }` (removed above) and from `#center` in `src/App.css`. `App.css` is imported nowhere (checked with a grep of `src/` and `index.html`), so its rules already have no effect. The plan leaves `App.css` and `src/assets/*` on disk unimported, in line with the previous plan's "no unrelated cleanup". Whether to delete them is Q6.

## 3. Primitives

All primitives live in `src/features/sessions/ui/`. Each file exports one component (so `react-refresh/only-export-components` stays clean) and imports its own `.css`. None of them holds state except the `useId` call in FormField.

### Button: `src/features/sessions/ui/Button.tsx` and `Button.css`

```ts
type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'type'> & {
  type: 'button' | 'submit'          // required: explicit type, per design
  variant?: 'primary' | 'secondary'  // default 'primary'
  pending?: boolean                  // disables the button and swaps the label
  pendingLabel?: string              // label shown while pending; children otherwise
}
```

- It renders a native `<button>` with `class="btn btn--{variant} {className}"`. `disabled = disabled || pending`. It shows `pending && pendingLabel ? pendingLabel : children`. `ref` passes through, which works because React 19 treats `ref` as a prop.
- CSS:
  - Size: `min-block-size: var(--control-height)`, padding `0 var(--space-4)`, `--radius-control`, font 15px/500, `font-family: inherit`.
  - Primary: `--accent` fill, `--on-accent` text, transparent 1px border.
  - Secondary: `--surface-card` fill, 1px `--border-strong` border, `--text` label.
  - Hover: `:hover:not(:disabled)` uses `--accent-hover` for primary and `--surface-page` for secondary.
  - Focus: `:focus-visible` gives a 2px solid `--focus-ring` outline with a 2px offset.
  - Disabled: `:disabled` gives `opacity: .6` and `cursor: not-allowed`.
  - No transitions.
- Variants: `primary` ("New session", "Create session") and `secondary` ("Retry"). No size variant. Full-width behavior comes from contextual classes passed through `className`.

### Badge: `src/features/sessions/ui/Badge.tsx` and `Badge.css`

```ts
type BadgeProps = { status: SessionStatus }
```

- It renders `<span class="badge badge--{status}">{status}</span>`. There is no role and no icon. The text is the lowercase stored word.
- CSS: `display: inline-block`, padding `2px 8px`, `--radius-pill`, 13px/500, `line-height: 1.4`, `white-space: nowrap`. Each `.badge--{status}` sets `color` and `background` from `--status-{status}-fg/bg`.
- Variants: one per `SessionStatus`. `cancelled` uses the gray tokens, never `danger`.

### Card: `src/features/sessions/ui/Card.tsx` and `Card.css`

```ts
type CardProps = { children: ReactNode; padded?: boolean; className?: string } // padded default true
```

- It renders `<div class="card [card--padded] {className}">`.
- CSS: `--surface-card` background, 1px `--border-subtle` border, `--radius-card`, no shadow, `overflow: hidden` so row dividers and bands respect the radius. `.card--padded` has 16px padding, and 24px from 600px up.
- Variants: padded (the form card) and unpadded (the list card).

### FormField: `src/features/sessions/ui/FormField.tsx` and `FormField.css`

```ts
type FieldControlProps = {
  id: string
  className: 'field__control'
  'aria-invalid'?: true
  'aria-describedby'?: string
}
type FormFieldProps = {
  label: string
  error?: string
  className?: string
  children: (control: FieldControlProps) => ReactNode   // render prop: the control slot
}
```

- It renders `<div class="field {className}"><label for={id} class="field__label">{label}</label>{children(control)}{error && <p id={errorId} class="field__error">{error}</p>}</div>`. The ids come from `useId()`. `aria-invalid` and `aria-describedby` are set only when `error` is truthy, which matches today's markup.
- The caller spreads `control` onto its `<input>` or `<select>` and attaches its own `ref` for focus management.
- CSS:
  - `.field`: flex column, `gap: var(--space-1)`.
  - `.field__label`: 14px/500 `--text`.
  - `.field__control`: `block-size: var(--control-height)`, `inline-size: 100%`, `box-sizing: border-box`, `--radius-control`, 1px `--border-strong` border, `--surface-card` background, `color: var(--text-strong)`, `font: inherit`, `font-size: 16px`, padding `0 var(--space-3)`.
  - `.field__control[aria-invalid='true']`: `border-color: var(--danger)`.
  - `.field__control:focus-visible`: the same ring as Button.
  - `.field__error`: 14px `--danger`.
- Variants: none. The Status select uses the same primitive and never gets an `error`.

## 4. File-by-File Changes (implementation order)

After each step, `npm run typecheck`, `npm run lint` and `npm test` must pass and `npm run build` must succeed. Steps 2a to 2d are independent and can run in any order.

**Step 1: Tokens and base reset.** File: `src/index.css`.

- Replace the starter tokens and rules as described in section 2. Add `.page` and `.visually-hidden`.
- No TSX changes, so tests are unaffected (Vitest does not load CSS).
- In the browser, the current unstyled markup is now left-aligned on a gray page with a 24px `h1`. `.page` is unused until step 4. This is the expected intermediate look.

**Step 2a: Button.** Create `src/features/sessions/ui/Button.tsx` and `Button.css`. Nothing uses them yet.

**Step 2b: Badge.** Create `src/features/sessions/ui/Badge.tsx` and `Badge.css`.

**Step 2c: Card.** Create `src/features/sessions/ui/Card.tsx` and `Card.css`.

**Step 2d: FormField.** Create `src/features/sessions/ui/FormField.tsx` and `FormField.css`.

**Step 3: Session rows.** Files: `src/features/sessions/SessionList.tsx` and a new `SessionList.css`.

- Each row is `<li class="session-row">` holding `<span class="session-row__title">`, `<Badge status>` and `<span class="session-row__start">`. Remove the `·` text nodes. The `<ul class="session-list">` has no list style, padding or margin.
- Empty: `<p class="sessions-message sessions-message--center">No sessions</p>`.
- `.sessions-message` is defined here because the loading state in step 4 reuses it: 24px padding, `--text-muted`, and the `--center` modifier sets `text-align: center`.
- Row grid:
  - Below 600px: columns `auto 1fr`. The title spans both columns on line 1; the badge and start sit on line 2, with the start left of the remaining space. Gap is 4px/12px.
  - At 600px and up: `grid-template-columns: 1fr auto auto` and `align-items: baseline`. The start is right-aligned with `font-variant-numeric: tabular-nums`.
- Row padding is `var(--space-3) var(--space-4)`. Dividers: `.session-row + .session-row { border-top: 1px solid var(--border-subtle) }`.
- The tests stay green: the title text, the `scheduled` text inside the `li`, and the `listitem` count are unchanged. Add test T1 in this step.

**Step 4: Workspace layout, states and header.** Files: `src/features/sessions/SessionsWorkspace.tsx`, a new `SessionsWorkspace.css`, and `src/App.tsx`. They change in the same step so there is never zero or two `h1`s.

- `App.tsx`: `<main className="page"><SessionsWorkspace /></main>`. Remove the `h1`.
- `SessionsWorkspace` returns, in every state, `<div class="sessions">` with `<header class="sessions-header"><h1>Training sessions</h1>{ready && !isFormOpen && <Button ref={newSessionRef} type="button" className="sessions-header__action" onClick={openForm}>New session</Button>}</header>`, followed by the state body:
  - Loading: `<Card padded={false}><p role="status" className="sessions-message">Loading sessions…</p></Card>`.
  - Error: `<Card padded={false}><div role="alert" className="sessions-band"><p className="sessions-band__text">Couldn't load sessions.</p><Button variant="secondary" type="button" onClick={handleRetry}>Retry</Button></div></Card>`.
  - Ready: in this order,
    - `<div class="sessions-toolbar">` holding `<FormField label="Status">` with a `<select ref={statusRef} {...control}>` that has the same options and values as today
    - `{isFormOpen && <CreateSessionForm onCreated={handleCreated} />}`
    - `<Card padded={false}><SessionList sessions={filtered} /></Card>`
    - `<p role="status" className="visually-hidden">{announcement}</p>`
- New state and refs:
  - `announcement: string` (initially `''`)
  - `newSessionRef`, `statusRef`
  - `focusNewSessionOnClose` and `focusStatusOnReady` (`useRef(false)` flags)
- New handlers:
  - `openForm` calls `setAnnouncement('')` and `setIsFormOpen(true)`.
  - `handleRetry` keeps its current behavior and also sets `focusStatusOnReady.current = true`.
  - `handleCreated` keeps its current behavior and also sets `focusNewSessionOnClose.current = true` and calls `setAnnouncement('Session created')`.
- Two effects. They only read refs and call `.focus()`; they never set state.
  - On `[load.status]`: if the status is ready and the flag is set, clear the flag and focus `statusRef`.
  - On `[isFormOpen]`: if the form is closed and the flag is set, clear the flag and focus `newSessionRef`.
- The data-loading effect, the `AbortController`, the filter derivation and `handleCreated`'s list/filter logic stay the same.
- `SessionsWorkspace.css`:
  - `.sessions`: flex column with a 24px gap.
  - `.sessions-header`: below 600px, flex column, `align-items: stretch`, 12px gap. At 600px and up, a row with `align-items: baseline` and `justify-content: space-between`.
  - `.sessions-toolbar .field__control`: `inline-size: 100%` below 600px, `200px` at 600px and up.
  - `.sessions-band`: `--danger-bg` background, `var(--space-4)` padding (Q4), flex wrap, column below 600px and row at 600px and up with `align-items: center` and `justify-content: space-between`, 12px gap.
  - `.sessions-band__text`: `--text-strong`, weight 500.
- The existing tests stay green, because `getByLabelText('Status')` now works through `for`/`id`. Add tests T2 to T5 and T9 to T10 in this step.

**Step 5: Create form card.** Files: `src/features/sessions/CreateSessionForm.tsx` and a new `CreateSessionForm.css`.

- Wrap the form in `<Card className="session-form-card">` with `<h2>New session</h2>` above `<form class="session-form" noValidate>`.
- Use `FormField` for Title (`type="text"`, `ref={titleRef}`) and for Start date and time (`type="datetime-local"`, `ref={startsAtRef}`), passing `error={errors.title}` and `error={errors.startsAt}`. This removes the hand-rolled ids and the `useId` call from the component.
- Put the form error in `<p role="alert" className="session-form__band">`, in the same place as now (after the fields, before the actions).
- The actions are `<div class="session-form__actions"><Button ref={submitRef} type="submit" pending={isPending} pendingLabel="Creating…" className="session-form__submit">Create session</Button></div>`.
- Focus:
  - A mount effect focuses `titleRef`.
  - In `handleSubmit`, when validation fails, focus `titleRef` if there is a title error, otherwise `startsAtRef`. This is an event handler, so it is not an effect.
  - An effect on `[formError, isPending]` focuses `submitRef` when `formError && !isPending`, which is after the button is re-enabled.
- The submit, validation, `inFlight` guard, `createSession` call and error copy stay the same.
- `CreateSessionForm.css`:
  - `.session-form`: flex column with a 16px gap, `margin-block-start: var(--space-4)` below the `h2`.
  - `.session-form__band`: `--danger-bg`, `--text-strong`, 500, `var(--space-3) var(--space-4)` padding, `--radius-control`.
  - `.session-form__submit`: `inline-size: 100%` below 600px. At 600px and up, `inline-size: auto` and `min-inline-size` set to fit "Create session" (start at `10rem`, then confirm in the browser that the label fits and the width is the same in both states).
- Existing test 3 stays green, because it keeps the element reference it captured before pending. Add tests T6 to T8 and extend test 3 in this step.

**Step 6: Verification and log.** Run section 6. Record the manual pass in `tasks/training-sessions/workflow-log.md` ("Manual Browser Observation").

Files that must not change: `sessionsClient.ts`, `validateSessionForm.ts`, `types.ts`, `src/mocks/*`, `src/test/setup.ts`, `main.tsx`, `vite.config.ts`, `eslint.config.js`, `package.json`, `index.html`.

## Contracts And Dependencies

- `FormField` passes `{ id, className, aria-invalid?, aria-describedby? }` to its render-prop child. Callers must spread all of it onto the control, or label and error wiring breaks (tests T7 and T2 catch this).
- `Button` requires `type`, which is a compile-time guarantee of the design's "explicit type" rule. `pending` implies `disabled`.
- `Badge` takes only `SessionStatus`, so an unknown status is a type error.
- Step 3 depends on 2b. Step 4 depends on 2a, 2c, 2d and 3. Step 5 depends on 2a, 2c and 2d, and can be done before or after step 4.
- Focus effects must only call `.focus()` on refs and clear ref flags. Do not call `setState` in them (eslint-plugin-react-hooks v7).

## 5. Test Impact

### Existing tests (`src/features/sessions/SessionsWorkspace.test.tsx`)

I read the code but did not run anything. With the markup above, **no existing test is expected to break**:

| Test | Queries it relies on | Why it survives |
| --- | --- | --- |
| filters sessions by status | `getByText(title)`, `getByLabelText('Status')`, `getAllByRole('listitem')` length, `selectOptions(..., 'completed' / 'All')` | The titles keep their own `<span>`. The label moves from wrapping to `for`/`id`, and both resolve the same way. The number of `li` items is unchanged. Option values and text are unchanged. |
| creates a session and shows it as scheduled under All | `getByRole('button', {name:'New session'})` before the form opens; `getByLabelText('Title' / 'Start date and time')`; `getByRole('button', {name:'Create session'})`; `within(li).getByText('scheduled')`; select `.value === 'all'` | The button is clicked before it is hidden. The labels are unchanged. The `h2` "New session" is not a button. The Badge text is exactly `scheduled`. |
| sends only one create request while one is pending | Captures `submit` by name before submitting, then reads `.disabled` | The element reference is the same node, and the label change does not matter to it. |

The tests would break under these conditions:

- If Q3 (status casing) is answered "Capitalize", `within(item).getByText('scheduled')` breaks and the option text changes. `selectOptions` would still match by value.
- If Q1 adds a Cancel button, nothing breaks, but new tests are needed.
- If someone renders the Badge word twice, or adds a `title` attribute to the Badge, `getByText` becomes ambiguous.

### Changes to existing tests

- Test 3: also assert `submit.textContent === 'Creating…'` while pending.

### New tests (same file, same `server.use` and `userEvent` style as the existing tests)

Each test is listed with the step that introduces it.

- **T1 (step 3), badge and row.** After load, the row for "Performance workshop" contains the text `cancelled`, and its `textContent` contains no `·`.
- **T2 (step 4), loading.** Right after render, `getByRole('status')` has the text "Loading sessions…". `queryByLabelText('Status')` and `queryByRole('button', {name:'New session'})` are null. The `h1` "Training sessions" is present.
- **T3 (step 4), list error, retry and focus.** With `server.use(listErrorOnce)`, the `role="alert"` region contains "Couldn't load sessions." and a **Retry** button. The Status select and **New session** are absent. Click Retry, then await "React fundamentals". The alert is gone and `document.activeElement` is the Status select.
- **T4 (step 4), New session visibility.** It is visible after load. After clicking it, `queryByRole('button', {name:'New session'})` is null and the `h2` "New session" (`getByRole('heading', {level: 2})`) is present.
- **T5 (step 4), success focus and announcement.** After a valid create, `document.activeElement` is the **New session** button and the `role="status"` region has the text "Session created".
- **T6 (step 5), form-open focus.** After clicking **New session**, `document.activeElement` is the Title input.
- **T7 (step 5), validation.**
  - Submit with a whitespace-only title and an empty date. Both messages appear. Each input has `aria-invalid="true"`, and its `aria-describedby` points to the element holding its message. Focus is on Title. Use a counting POST handler and assert it was not called.
  - Then enter a valid title and submit again. Only the date error remains, and focus is on the date input.
- **T8 (step 5), create error.** With `server.use(createErrorOnce)`, a valid submit shows `role="alert"` with "Couldn't create the session. Try again.". The Title and date values are kept, the list still has 5 items, and `document.activeElement` is the **Create session** button.
- **T9 (step 4), empty.** With `server.use(http.get('/api/sessions', () => HttpResponse.json([])))`, "No sessions" is shown and the Status select is still present.
- **T10 (step 4), one `h1`.** After load there is exactly one `getAllByRole('heading', {level: 1})`.

"Focus after cancel" is not tested, because the design has no Cancel (Q1).

### Additional risk-based tests (optional)

- Small unit tests for the primitives:
  - `FormField` without `error` renders no `aria-invalid` or `aria-describedby`.
  - `Button` with `pending` is disabled and shows `pendingLabel`.
- A repeated create failure moves focus back to submit again. This exercises the `formError` reset path.

Visual properties (colors, 44px heights, the 600px layout) cannot be tested in jsdom, because CSS is not loaded. They are covered by the browser check.

## 6. Verification Checklist

Run these from the repository root. They are the existing scripts in `package.json`.

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`: all existing tests and T1 to T10 pass
- [ ] `npm run build`: succeeds (the existing chunk-size warning is acceptable)

Browser check (`npm run dev`, then open the URL Vite prints). Use devtools device emulation at **375px** and **1280px**, and also check 320px for horizontal scroll:

- [ ] 1280px:
  - [ ] the column is 720px and centered, with a 24px gutter, a 32px top padding and no side borders
  - [ ] the `h1` (24px) and **New session** sit on one baseline
  - [ ] the select is about 200px wide
  - [ ] each row is one line: title, badge, then a right-aligned start time
  - [ ] there are dividers between rows and none after the last
- [ ] 375px:
  - [ ] the gutter is 16px
  - [ ] **New session**, the select and **Create session** are full width and 44px high
  - [ ] rows have two lines
  - [ ] the Retry button sits below the error text
- [ ] 320px: no horizontal scrollbar with a long (80-character) title.
- [ ] States:
  - [ ] loading text (muted, no spinner)
  - [ ] filter to each status, then back to `All`
  - [ ] "No sessions" (centered)
  - [ ] invalid submit: both messages, red borders, focus on Title
  - [ ] pending: "Creating…", disabled, width unchanged
  - [ ] success: form closes, `All`, new `scheduled` row, focus on **New session**
- [ ] Create error: add `?mock=create-error` to the URL. A band appears above the submit button, values are kept and focus is on the submit button. The second attempt succeeds.
- [ ] List error: run `npm run build && npm run preview` and add `?mock=list-error` to the URL. The danger band and secondary **Retry** appear, then Retry loads the list and puts focus on Status. Use preview rather than dev because of the StrictMode one-shot note in the previous plan.
- [ ] Keyboard-only pass: the Tab order is New session → Status → (Title → Start → Create session). Every stop shows a 2px blue ring with an offset. Rows are never focused.
- [ ] Dark mode (devtools "prefers-color-scheme: dark"):
  - [ ] the dark tokens apply
  - [ ] the primary button text is dark on light blue
  - [ ] `cancelled` is gray, never red
  - [ ] the native date picker follows the theme
- [ ] Record the commands, URLs and observations in `workflow-log.md`.

## 7. Out of Scope (copied from ui-design.md)

Out of scope, per the requirements and the task boundary: session details, search, multi-select filters, sorting, pagination, modals or drawers, delete or edit actions, toasts, a theme switcher, and any new UI library.

The design's defaults also hold: no Cancel or close button on the create form, no scroll to or highlight of a new row (and no sorting), status words stay lowercase, there is no hint text under fields before submit, there are no icons in badges or errors, there is no spinner, there is no row hover or focus, and primitives are not extracted to a shared folder.

## Risks And Rollback

- **The form cannot be dismissed.** With no Cancel and **New session** hidden, a trainer who opens the form can only leave it by creating a session or reloading the page. This follows the design exactly; see Q1.
- **Pending width.** `min-inline-size` is font-dependent. If the system font renders "Create session" wider than the minimum, the button shrinks during pending. The browser check catches this, and the fix is to raise the value.
- **Focus with a disabled button.** Covered by the explicit `submitRef` focus after the error and by test T8.
- No feature flag is needed. Rollback is a revert of the steps, because no data, API or dependency changes.

## 8. Open Questions

None of these block the work; the defaults in this plan apply unless you change them.

1. **Cancel or close on the create form?** The design's default is none. Your brief mentions "focus … after submit or cancel". Combined with "New session hidden while the form is open", the form cannot be dismissed without creating a session. Should a secondary "Cancel" be added? If yes, say where focus goes afterwards. The plan's suggestion would be **New session**, and the change would extend Button usage plus T4 and T5. Default: no Cancel.
2. **Dark-mode primary label color.** The design names "`text-strong-dark`" at 7.0:1. The plan uses `#0f172a`, the only value that gives 7.0:1 on `#60a5fa`, as a new `--on-accent` token. Confirm.
3. **Status casing.** Keep lowercase as stored (the design's default) or capitalize? Capitalizing changes user-visible text and the existing test 2.
4. **Padding of the list-error band.** The design specifies the band's color and text but not its padding. The plan uses 16px on all sides, filling the unpadded list card. Confirm, or use 24px to match the loading and empty messages.
5. **Focus after a failed retry.** If Retry fails again, the Retry button is unmounted during loading and focus falls to `<body>`. The design does not cover this. Should focus move back to Retry? Default: no handling.
6. **Starter leftovers.** `src/App.css` and `src/assets/*` are unused (nothing imports them). Delete them as part of this restyle, or leave them? Default: leave them.

## Next Role

`coder`, with this plan, `ui-design.md` and `requirements.md`.
