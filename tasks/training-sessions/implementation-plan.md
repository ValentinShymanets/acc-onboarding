# training-sessions: Implementation Plan

Source: `tasks/training-sessions/requirements.md` (developer decisions of 2026-10-21, both assumptions accepted). No `ui-design.md` exists. Markup below is the minimum needed to meet the criteria. It is not a design direction.

## Application Root

Repository root (`/`). It is the only frontend app: one Vite 8 + React 19 + TypeScript 6 package, npm (`package-lock.json`), Node 24.

## Current Behavior

- `src/App.tsx` renders the Vite starter counter. There is no sessions feature, no HTTP client, no mock layer, and no test runner.
- `package.json` scripts: `dev`, `build` (`tsc -b && vite build`), `lint` (`eslint .`), `preview`.
- `src/main.tsx` renders `<App />` inside `<StrictMode>`. In dev, StrictMode runs mount effects twice.

## Intended Behavior

`App` renders a Training Sessions workspace that:

1. loads sessions through `sessionsClient` (fetch), shows a loading state, then either the list or one error with **Retry**;
2. after a successful load, shows a single `Status` select (`All`, `scheduled`, `completed`, `cancelled`, initial `All`), a **New session** button, and the filtered list or "No sessions";
3. opens a create form (title + `datetime-local`), validates on submit with inline messages, guards against a duplicate submit while the request is pending, keeps the values and shows an inline form error on failure, and on success closes the form, resets the filter to `All`, and appends the returned session to the list.

All data comes from MSW handlers at `/api/sessions`. A service worker serves them in the browser, and `msw/node` serves them in tests.

## Planning Decisions

These are owned by this plan because the requirements left them open (see "Gaps").

| Decision | Choice | Reason |
| --- | --- | --- |
| Mock mechanism | MSW 2 (`setupWorker` in the browser, `setupServer` in tests) | Allowed by TASK.md. Mocks at the HTTP level, so the fetch client stays the real boundary. |
| Test runner | Vitest + jsdom + Testing Library | Shares Vite's config and transforms. Needs no extra build setup. |
| Provisional contract | See "Provisional API Contract" | No backend contract exists. It is labelled provisional in code comments, in line with `rulesets/common/api-integration/rules/contract-evidence.md`. |
| Mock activation | MSW starts in every mode (dev, preview) before the first render | There is no backend. The mock is the only data source by requirement. |
| Error triggers | URL query `?mock=list-error` (and `?mock=create-error`) in the browser, `server.use(...)` in tests | Gives a way to trigger the list error without adding UI. `create-error` only makes the required create-failure criterion checkable by hand. |
| **New session** visibility | Only in the loaded state, like the filter | Avoids creating into a list that never loaded. The requirements are silent on this. Change it if the developer disagrees. |
| State ownership | Local React state in `SessionsWorkspace`. No context, no store, no data library. | One screen, one owner. Nothing else consumes the data. |

## Provisional API Contract (mock only, unconfirmed)

- `GET /api/sessions` → `200` `Session[]`. Any non-2xx response is a failure.
- `POST /api/sessions`, body `{ title: string; startsAt: string /* ISO 8601 UTC */ }` → `201` `Session`. Any non-2xx response is a failure.
- `Session = { id: string; title: string; status: 'scheduled' | 'completed' | 'cancelled'; startsAt: string /* ISO 8601 */ }`.
- The error body is `{ message: string }`. The UI does not depend on it and shows its own fixed copy.

## Dependencies And Scripts

Install (devDependencies only, no runtime dependencies):

```bash
npm install -D vitest jsdom msw @testing-library/react @testing-library/dom @testing-library/user-event
```

- `@testing-library/dom` is a required peer of `@testing-library/react` v16.
- `@testing-library/jest-dom` is deliberately not added. Tests use Vitest's built-in matchers.
- Accept the latest versions npm resolves. **Gate:** the installed `vitest` must list Vite 8 in its peer range. If npm reports a peer conflict, STOP and report it. Do not use `--force` or `--legacy-peer-deps`.

Generate the worker file once, after the install:

```bash
npx msw init public
```

This creates `public/mockServiceWorker.js`. Commit it. Do not edit it by hand.

New `package.json` scripts (keep the existing four unchanged):

```json
"test": "vitest run",
"typecheck": "tsc -b"
```

## Files

### Create

| File | Purpose / contract |
| --- | --- |
| `src/features/sessions/types.ts` | `SessionStatus`, `SESSION_STATUSES` (readonly tuple, in display order), `Session`, `NewSessionInput = { title: string; startsAt: string }`. |
| `src/features/sessions/sessionsClient.ts` | **The replaceable request boundary.** Exports `listSessions(signal?: AbortSignal): Promise<Session[]>` and `createSession(input: NewSessionInput): Promise<Session>`. Uses `fetch` with the URL resolved against `window.location.origin` (`new URL('/api/sessions', window.location.origin)`). Node's fetch in jsdom rejects relative URLs. Throws `SessionsRequestError` (status code plus message) on a non-2xx response. A network error or `AbortError` propagates unchanged. Components import only this module for data, never `fetch` or MSW. |
| `src/features/sessions/validateSessionForm.ts` | Pure function `validateSessionForm({ title, startsAt }, now = Date.now())` that returns `{ title?: string; startsAt?: string }`. Title: `trim().length` between 3 and 80 inclusive, otherwise "Title must be 3–80 characters." Date: empty, or `new Date(value).getTime() <= now` (a `datetime-local` value is parsed as local time), otherwise "Choose a future date and time." The `now` parameter keeps it testable without fake timers. |
| `src/features/sessions/SessionList.tsx` | Presentational. Props `{ sessions: Session[] }`. Renders `<ul>` with one `<li>` per session: title, status, `new Date(startsAt).toLocaleString()`. Renders "No sessions" when the array is empty. |
| `src/features/sessions/CreateSessionForm.tsx` | Owns the field values, field errors, form error, and pending state. Props `{ onCreated: (session: Session) => void }`. Labelled `Title` text input and `Start date and time` `datetime-local` input. Each field message sits directly under its field and is linked with `aria-describedby`. On submit: `preventDefault`, then return early if a request is in flight (a `useRef` flag, so two clicks in the same tick are also blocked), then run `validateSessionForm` and stop if there are errors. Otherwise set the pending flag, disable the submit button, and call `createSession({ title: title.trim(), startsAt: new Date(value).toISOString() })`. On success call `onCreated`. On failure show the inline form error "Couldn't create the session. Try again." and keep the values. Always clear the pending flag. |
| `src/features/sessions/SessionsWorkspace.tsx` | Owns `load: { status: 'loading' } \| { status: 'error' } \| { status: 'ready'; sessions: Session[] }`, `filter: 'all' \| SessionStatus`, `isFormOpen`. A load effect calls `listSessions(signal)` with an `AbortController`, aborts on cleanup, and ignores `AbortError`. **Retry** goes back to `loading` and runs the same load again (for example by bumping a `loadAttempt` counter in the effect deps). Loading renders "Loading sessions…" only. Error renders "Couldn't load sessions." plus a **Retry** button only. Ready renders the `Status` select, the **New session** button, the form when open, and `<SessionList sessions={filtered} />`, where `filtered` is derived during render, not stored. `onCreated` appends the session, sets the filter to `all`, and closes the form. |
| `src/mocks/handlers.ts` | Provisional, labelled as such. In-memory `sessions` array seeded with at least 5 sessions that cover all three statuses (at least 2 `scheduled`, so `All` and each status differ visibly). Exports: `handlers` (happy-path GET returns the array; POST builds `{ id: crypto.randomUUID(), title, startsAt, status: 'scheduled' }`, appends it, returns `201`), `listErrorOnce` (GET → `500`, `{ once: true }`), `createErrorOnce` (POST → `500`, `{ once: true }`), and `resetSessions()` (restores the seed for test isolation). |
| `src/mocks/browser.ts` | `setupWorker(...handlers)`. Exports `startMocking()`: reads `new URLSearchParams(location.search).get('mock')`, calls `worker.use(listErrorOnce)` or `worker.use(createErrorOnce)` to match, then `worker.start({ onUnhandledRequest: 'bypass' })`. |
| `src/mocks/server.ts` | `setupServer(...handlers)` for tests. |
| `src/test/setup.ts` | Vitest setup: `beforeAll(server.listen({ onUnhandledRequest: 'error' }))`. `afterEach`: `cleanup()` from Testing Library (Vitest globals are off, so auto-cleanup does not run), `server.resetHandlers()`, `resetSessions()`. `afterAll(server.close())`. |
| `src/features/sessions/SessionsWorkspace.test.tsx` | The essential behavior tests (see "Tests"). Explicit `import { describe, it, expect } from 'vitest'`. |
| `public/mockServiceWorker.js` | Generated by `npx msw init public`. |

### Modify

| File | Change |
| --- | --- |
| `package.json` | devDependencies from the install. Add the `test` and `typecheck` scripts. Change nothing else. |
| `vite.config.ts` | Add `/// <reference types="vitest/config" />` and `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] }`. Keep the plugin config unchanged. |
| `src/main.tsx` | `startMocking().then(() => createRoot(...).render(...))`. Keep `StrictMode` and the `index.css` import. |
| `src/App.tsx` | Replace the starter markup and its asset and `App.css` imports with `<SessionsWorkspace />` under a page heading ("Training sessions"). Leave the starter asset files and `App.css` on disk. Deleting them is unrelated cleanup. |
| `eslint.config.js` | Add `'public/mockServiceWorker.js'` to `globalIgnores([...])` next to `'dist'`. It is a generated vendor file. |

`tsconfig.*` needs no change. Test files live under `src` (covered by `tsconfig.app.json`), and `vite.config.ts` is already covered by `tsconfig.node.json`.

## Implementation Order

1. **Tooling.** Install the devDependencies (and pass the peer gate), run `npx msw init public`, add the scripts, add the Vite `test` block, and add the ESLint ignore. Check: `npm run typecheck` and `npm run lint` still pass on the unchanged app.
2. **Types and client.** Create `types.ts` and `sessionsClient.ts`.
3. **Mocks.** Create `handlers.ts`, `server.ts`, `browser.ts`, and `src/test/setup.ts`. Depends on 2 (types only).
4. **Validation.** Create `validateSessionForm.ts`. Depends on 2. Can run in parallel with 3.
5. **UI.** Create `SessionList.tsx`, then `CreateSessionForm.tsx` (needs 2 and 4), then `SessionsWorkspace.tsx`.
6. **Wiring.** Update `main.tsx` (needs 3) and `App.tsx` (needs 5).
7. **Tests.** Create `SessionsWorkspace.test.tsx` (needs 3, 5, 6). Then run the verification below.

## Tests

### Essential (required by the acceptance criteria)

File: `src/features/sessions/SessionsWorkspace.test.tsx`. Render `<SessionsWorkspace />` and drive it with `userEvent.setup()`. Query by role, label, and text, never by internal state.

1. **Filters by status.** Wait for a seeded title (`findByText`). Every seeded title is visible under `All`. `selectOptions(getByLabelText('Status'), 'completed')`: only the completed titles remain and a known `scheduled` title is gone. Selecting `All` brings every title back.
2. **Creates a session.** Click **New session**. Type a unique title. Set the date to a fixed far-future value (`'2099-01-01T10:00'`) with `fireEvent.change`, because user-event typing into `datetime-local` is unreliable in jsdom. Click **Create session**. Then: the form is gone, `Status` reads `All`, and the list item containing the new title also contains `scheduled` (`within(item)`).
3. **Blocks a duplicate submit while pending.** `server.use` a POST handler that counts calls and `await delay(100)`. Fill in valid values and click **Create session** twice. Then: the submit button is disabled while pending, the call count is `1`, and the title appears once after resolution.

Test 1 or 2 alone meets the minimum. Test 3 is included because the pending guard is otherwise untested.

### Additional (risk-based, cheap with this setup, not required)

- List error and retry: `server.use(listErrorOnce)`. The error and **Retry** show, the `Status` select is absent, and clicking **Retry** shows the sessions with the error gone.
- Validation: a whitespace-only title and a past date each show their message under the field, and no POST is sent.
- Create failure: `server.use(createErrorOnce)`. The form stays open with the inline error, the values are kept, and the list is unchanged.
- Empty list: `server.use` a GET that returns `[]` → "No sessions".
- `validateSessionForm` unit cases at the 2, 3, 80, and 81 character boundaries and at `now`.

## Verification

Run from the repository root, in this order:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Manual pass (this is the requirement's "real manual pass"; record it in `workflow-log.md`):

- `npm run dev`, open the URL Vite prints: loading → list → filter to each status → `All` → **New session** → invalid submit (inline messages) → valid submit → form closes, filter is `All`, new `scheduled` session visible.
- Create failure: same URL plus `?mock=create-error`. The first create shows the inline form error and keeps the values. The second create succeeds.
- List error: `npm run build && npm run preview`, open the printed URL plus `?mock=list-error`. The error and **Retry** show, and **Retry** loads the list. Use `preview` for this check. In `dev`, StrictMode runs the load effect twice, and the first (aborted) request may use up the one-shot failure, so no error appears. That is a dev-only artifact, not a defect.

## Risks

- **Vite 8 / Vitest compatibility:** covered by the install gate above.
- **StrictMode and one-shot mocks:** see the manual list-error note. Tests are unaffected because they render without StrictMode.
- **MSW in production builds:** intended. There is no backend. Replacing the mock means changing `startMocking()` in `main.tsx` and leaving `sessionsClient.ts` as is.
- No rollback or feature flag is needed: this is a greenfield screen with no existing users.

## Out Of Scope (unchanged from the requirements)

No cancel/close button on the form, no detail views, search, pagination, multi-status filter, styling or design-system work, `jest-dom`, CI, backend, or strict-mode TypeScript changes. The starter files are not deleted.

## Next Role

`coder`, with this plan and `requirements.md`.
