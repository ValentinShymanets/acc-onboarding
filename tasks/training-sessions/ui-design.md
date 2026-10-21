# training-sessions: UI Design

## Inputs

- Acceptance source: `tasks/training-sessions/requirements.md` (developer decisions recorded 2026-10-21).
- Workflow decisions: `tasks/training-sessions/workflow-log.md`.
- Existing UI: the `src/features/sessions/` components are implemented as unstyled markup. `src/index.css` and `src/App.css` still hold the Vite starter styles (centered text, 1126px bordered `#root`, 56px `h1`, purple accent). No design system, tokens, or shared primitives exist.
- Visual direction: **Calm operational**, chosen by the developer on 2026-10-21. This means neutral grays, one blue accent, compact rows that are easy to scan, left-aligned text, and the system font. The developer rejected two other options: "Friendly cards" and "Keep Vite starter look".

## Scope

In scope: the workspace header, the status filter, the session list, the create form, and their loading, error, empty, validation, pending and create-error states. It also covers four primitives: Button, Badge, Card and FormField.

Out of scope, per requirements and boundary: session details, search, multi-select filters, sorting, pagination, modals or drawers, delete or edit actions, toasts, a theme switcher, and any new UI library. This document contains no code or CSS. Values are design tokens for the implementer to express in the existing plain-CSS setup.

## Design Principles

1. **Scan first.** Title, status and start time sit on one line per session on wide screens, in fixed positions.
2. **Status never relies on color alone.** Every badge shows its status word.
3. **Red means failure only.** `cancelled` is neutral gray, so it never reads as an error.
4. **Feedback appears where the problem is.** Field errors go under the field, the create error goes inside the form, and the list error replaces the list.

## Flow

```
open workspace
  └─ Loading ──ok──► Ready (filter + list) ──"New session"──► Ready + Create form open
        │                 ▲         │                              │ submit
        └─fail─► List error│         └─ filter change              ├─ invalid ─► inline field errors (form stays)
                 └─Retry──►Loading                                 ├─ pending ─► submit disabled, "Creating…"
                                                                   ├─ fail ────► inline form error, values kept
                                                                   └─ ok ──────► form closes, filter = All, row visible
```

## Layout

Single column, left-aligned, centered in the viewport.

| Property         | Value                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| Content width    | max 720px, centered                                                       |
| Page gutter      | 16px below 600px; 24px from 600px up                                      |
| Vertical rhythm  | 24px between header, toolbar, form card and list card; 32px top padding   |
| Page background  | `surface-page`. Cards use `surface-card`.                                 |

The implementation must neutralize the starter `#root` rules for this screen: no centered text, no fixed 1126px width, no side borders, and no 56px heading.

### Regions (top to bottom)

1. **Header row.** The `h1` "Training sessions" sits on the left. The primary Button "New session" sits on the right, on the same baseline. Below 600px, the button wraps under the heading at full width.
   - "New session" appears only in the Ready state, because a created session has nowhere to appear without a loaded list.
   - While the form is open, "New session" is hidden. The form is the active task, and there is no second way into it.
2. **Toolbar** (Ready only). It holds the "Status" FormField with a native `<select>` (`All`, `scheduled`, `completed`, `cancelled`), about 200px wide, or full width below 600px. It is not rendered while loading or in the list-error state.
3. **Create form card** (when open). It is inline, between the toolbar and the list, and is not a modal. This keeps the list visible and avoids focus-trap complexity. Card title: "New session" (`h2`).
4. **List card.** A Card containing the session rows, the empty message, the loading state, or the list error.

## Components and Primitives

### Button

| Variant   | Use                         | Light                                         | Dark                                          |
| --------- | --------------------------- | --------------------------------------------- | --------------------------------------------- |
| Primary   | "New session", "Create session" | `accent` fill, white text (5.2:1)          | `accent` fill, `text-strong-dark` text (7.0:1) |
| Secondary | "Retry"                     | `surface-card` fill, `border-strong` border, `text` label | same, using dark tokens            |

- Height is at least 40px (44px below 600px for touch), with 16px horizontal padding, 6px radius, 15px/500 label, and the system font.
- Hover: primary uses `accent-hover`, and secondary uses `surface-page` fill. There is no transition, or at most 100ms, and none under `prefers-reduced-motion`.
- Focus-visible: a 2px `focus-ring` outline with a 2px offset on every variant. The default outline is never removed without this replacement.
- Disabled or pending: 60% opacity and a `not-allowed` cursor. The label stays readable. When pending, the label changes (see Create form) so the state is not shown by opacity alone.
- Native `<button>` with an explicit `type`.

### Badge (status)

A pill with 2px × 8px padding, full radius, a 13px/500 label, and the status word in lowercase as stored, which matches the filter options. There is no icon.

| Status      | Light text / bg                  | Contrast | Dark text / bg                  | Contrast |
| ----------- | -------------------------------- | -------- | ------------------------------- | -------- |
| `scheduled` | `#1e40af` / `#dbeafe` (blue)     | 7.1:1    | `#bfdbfe` / `#1e3a8a`           | 7.3:1    |
| `completed` | `#166534` / `#dcfce7` (green)    | 6.5:1    | `#bbf7d0` / `#14532d`           | 7.5:1    |
| `cancelled` | `#334155` / `#f1f5f9` (gray)     | 9.5:1    | `#e2e8f0` / `#334155`           | 8.4:1    |

The badge is plain text in a `<span>` with no role. Screen readers read the word, which is enough.

### Card

A `surface-card` background with a 1px `border-subtle` border, 8px radius, and no shadow. Padding is 16px, or 24px from 600px up for the form card. The list card has no inner padding, because rows supply their own.

### FormField

The order inside a field is: label → control → error message.

- Label: 14px/500 `text`, 4px above the control, always visible, linked by `for`/`id`. Placeholders never replace labels.
- Control: 40px high (44px below 600px), 6px radius, a 1px `border-strong` border (meets 3:1 non-text contrast), `surface-card` fill, 16px text (prevents iOS zoom), and full width inside the form.
- Error: 14px `danger` text, 4px below the control, linked with `aria-describedby`. The control gets `aria-invalid="true"` and a `danger` border. The message text carries the meaning, so there is no icon.
- Fields are 16px apart.
- The same primitive wraps the Status select. That select never shows an error.

## Session Row

| ≥ 600px (one line, three columns)                                 | < 600px (two lines)                    |
| ----------------------------------------------------------------- | -------------------------------------- |
| Title (fills remaining space) · Badge (auto) · Start (right-aligned, tabular numbers) | Line 1: Title<br>Line 2: Badge · Start |

- The row has 12px × 16px padding, and a 1px `border-subtle` divider between rows but not after the last one.
- Title: 16px/500 `text-strong`. It wraps onto more lines and is never truncated, because titles are at most 80 characters.
- Start: 14px `text-muted`, showing `new Date(startsAt).toLocaleString()` exactly as required. Its width is not fixed, because locale output length varies.
- The row is not interactive: no hover state, no pointer cursor, and no focus stop.
- Semantics: keep the existing `<ul>`/`<li>`. Remove the visual `·` separators from the markup. Layout provides the separation, so screen readers no longer read the dots.

## State Matrix

| State                | What is visible                                                                                                     | Semantics and focus                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Loading**          | Header (without the "New session" button). The list card shows "Loading sessions…" in `text-muted` with 24px padding. No filter and no rows. | The container has `role="status"`. There is no spinner animation. A static text line is enough and respects reduced motion. |
| **List error**       | Header. The list card shows a `danger-bg` band holding the text "Couldn't load sessions." (`text-strong`, 500) and the Secondary Button "Retry" beside it, or below it under 600px. No filter. | `role="alert"` on the band. Retry switches back to Loading. On success, focus moves to the Status select so keyboard users don't lose their place. |
| **Ready, rows**      | Header with "New session", the toolbar, and the list card with rows.                                                | Not applicable.                                                                                                       |
| **Ready, empty**     | Toolbar stays visible. The list card shows "No sessions" in `text-muted` with 24px padding, centered inside the card. This covers both an empty load and a filter with no matches. | Plain text. The filter stays usable so the trainer can switch back to All.                                            |
| **Form open**        | The form card appears above the list. "New session" is hidden. The list stays visible and filterable.               | When the form opens, focus moves to the Title input.                                                                  |
| **Validation error** | Errors appear under each failing field. All values are kept.                                                        | Shown on submit only. Focus moves to the first invalid field, which then reads its message through `aria-describedby`. Errors stay until the next submit. They do not clear on input. |
| **Create pending**   | The submit button reads "Creating…" and is disabled. Inputs stay editable but are not resubmitted.                  | A second submit is ignored (already guarded). The button keeps its width so the layout doesn't shift.                 |
| **Create error**     | A `danger-bg` band at the bottom of the form, above the submit button: "Couldn't create the session. Try again." Values are kept. The list is unchanged. | `role="alert"`. Focus stays on the submit button, so pressing it again retries.                                       |
| **Create success**   | The form closes, the filter shows `All`, and the new row is in the list.                                            | Focus returns to the "New session" button. A visually hidden `role="status"` region announces "Session created".      |

Permission, destructive and partial-data states are not reachable in this task.

## Create Form Details

- Fields in order: **Title** (text) and **Start date and time** (native `datetime-local`). No hint text sits under the fields before submit. The rule appears only in the validation message, to keep the form compact.
- Messages (the meaning is fixed by the requirements; the wording is suggested):
  - Title: "Title must be 3–80 characters."
  - Date/time: "Choose a future date and time."
- Actions row: the Primary "Create session" sits on the left, aligned with the fields. It is full width below 600px.
- Enter in the Title field submits, which is native form behavior.

## Responsiveness

The single breakpoint is **600px**.

- Below 600px: 16px gutter, the header button wraps to full width, the select and submit button are full width, rows stack onto two lines, and controls and buttons are 44px high.
- From 600px up: 24px gutter, a 720px max content width, and single-line rows.
- No horizontal scrolling at 320px wide. Long titles and long locale date strings wrap.

## Color Tokens

| Token            | Light     | Dark      | Use                                   |
| ---------------- | --------- | --------- | ------------------------------------- |
| `surface-page`   | `#f8fafc` | `#0f172a` | page background                       |
| `surface-card`   | `#ffffff` | `#1e293b` | cards, inputs                         |
| `border-subtle`  | `#e2e8f0` | `#334155` | card border, row dividers (decorative) |
| `border-strong`  | `#64748b` | `#94a3b8` | input and secondary button borders (≥ 3:1) |
| `text-strong`    | `#0f172a` | `#f1f5f9` | headings, titles (17.9:1 / 13.4:1)    |
| `text`           | `#334155` | `#e2e8f0` | labels, body                          |
| `text-muted`     | `#475569` | `#94a3b8` | dates, loading, empty (7.6:1 / 5.7:1) |
| `accent`         | `#2563eb` | `#60a5fa` | primary button, focus ring            |
| `accent-hover`   | `#1d4ed8` | `#93c5fd` | primary hover                         |
| `focus-ring`     | `#2563eb` | `#60a5fa` | 2px outline                           |
| `danger`         | `#b91c1c` | `#fca5a5` | field errors, invalid border (6.5:1 / 7.7:1) |
| `danger-bg`      | `#fef2f2` | `#450a0a` | list-error and form-error band         |

- Dark values apply under `prefers-color-scheme: dark`. The starter CSS already declares `color-scheme: light dark`, so native controls, including the date picker, follow the theme.
- The listed contrast ratios were computed with the WCAG 2 formula against the paired surface. All text meets AA (4.5:1), and every pair except `text-muted` in dark mode meets AAA.

## Typography

System font stack (already in `index.css`). Base size is 16px.

| Role         | Size / weight | Color         |
| ------------ | ------------- | ------------- |
| `h1`         | 24px / 600    | `text-strong` |
| `h2` (form)  | 18px / 600    | `text-strong` |
| Row title    | 16px / 500    | `text-strong` |
| Label        | 14px / 500    | `text`        |
| Meta, error  | 14px / 400    | muted / danger |
| Badge        | 13px / 500    | per status    |

Spacing scale: 4, 8, 12, 16, 24, 32px.

## Accessibility Checklist

- One `h1`. The form has an `h2`. The landmark is the existing `<main>`.
- Every control has a visible, programmatic label. Errors are linked with `aria-describedby` and `aria-invalid`, as the current markup already does.
- `role="alert"` is used only for the list error and the create error. Loading and success use `role="status"`.
- Tab order follows visual order: New session → Status → (form fields → Create session) → nothing in rows.
- Focus moves on: form open (to Title), invalid submit (to the first invalid field), create success (to New session), and retry success (to Status).
- Visible focus rings are required, there is no color-only meaning, motion is disabled under `prefers-reduced-motion`, and touch targets are at least 44px below 600px.

## Reuse Candidates

These are local to `src/features/sessions/` unless another feature appears. Don't extract them to a shared folder for this task.

- **Button** (primary, secondary, plus a pending label)
- **Badge** (status → color mapping in one place)
- **Card**
- **FormField** (label, control slot, error with ids wired)

## Gaps Between This Design and the Current Implementation

These are for the implementer, not decided here:

- Visual styling is entirely missing, and the starter `#root`/`h1` styles conflict with the layout above.
- "New session" is always visible in Ready and stays visible while the form is open. The design hides it while the form is open.
- There is no focus management on form open, on invalid submit, after create success, or after retry success.
- There is no pending label ("Creating…") and no "Session created" status announcement.
- The loading text has no `role="status"`.
- Rows use `·` text separators.

## Unresolved Decisions

These are non-blocking, and the defaults above apply unless changed:

1. **No Cancel or close on the create form.** The requirements define closing only on success. Adding a Cancel button is a small addition, but it falls outside the stated flow. Default: none.
2. **Placement of the new session.** The list is unsorted, and the current code appends to the end. In a long list the new row can be off-screen. Default: no scroll or highlight. Sorting is out of scope.
3. **Status text casing.** The default is lowercase, as stored, to match the requirement's option labels. Capitalized display labels ("Scheduled") would read better but would change user-visible text that tests may match.
