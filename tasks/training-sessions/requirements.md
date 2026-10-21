# training-sessions: Training Sessions Workspace

## Goal

A trainer can open one workspace, see training sessions loaded from a mock API, filter them by one status, and create a session with a title and a future date/time so that the new session appears in the list.

## Users And Outcome

The user is a trainer. The outcome is a small workspace for viewing, filtering, and creating training sessions. The exercise is limited to that flow.

## Acceptance Criteria

### List

- [ ] Opening the workspace loads sessions through a replaceable request boundary and shows each session's title, status, and start date/time.
- [ ] A session's status is one of `scheduled`, `completed`, or `cancelled`.
- [ ] The start date/time is displayed as the browser's `toLocaleString()` output for that value.
- [ ] While the list request is pending, the workspace shows a loading state and does not present the list as ready.
- [ ] If the list request fails, the workspace shows one understandable error and a retry action in that state. Retrying does not require reloading or restarting the application.
- [ ] A successful retry clears the error and shows the sessions returned by that successful request.
- [ ] The filter is a single select with the options `All`, `scheduled`, `completed`, and `cancelled`. Only one option is active at a time, and `All` is the initial value.
- [ ] `All` shows every loaded session. Choosing a status shows only sessions with that status.
- [ ] The filter is shown only after a successful load. It is not shown while loading or in the list-error state.
- [ ] When the shown result is empty, the workspace shows "No sessions".
- [ ] For verification, the mock data includes sessions with more than one status, so `All` and at least one status option show visibly different results.

### Create

- [ ] The trainer can open a create form from the workspace.
- [ ] The form collects a title and a date/time.
- [ ] Validation runs on submit. Each validation message is shown inline under the field it refers to.
- [ ] A title is invalid when its trimmed length is under 3 or over 80 characters, including a title that is only whitespace. Submitting it does not create a session and shows a message under the title field that states the 3–80 character rule.
- [ ] A missing date/time, or a date/time that is not later than the browser's local current time, does not create a session and shows a message under the date/time field that a future date and time is required.
- [ ] A valid submission sends one create request through the same replaceable request boundary.
- [ ] While that create request is pending, another submit does not send a second create request.
- [ ] A successfully created session has status `scheduled`.
- [ ] After a successful create, the form closes, the filter resets to `All`, and the new session is visible in the list with the submitted title, `scheduled` status, and start date/time.
- [ ] If the create request fails, the form stays open, shows an inline form error, and keeps the entered title and date/time. No session is added to the list.

### Mock and test

- [ ] Session data stays behind that request boundary. The workspace does not talk to a backend service.
- [ ] At least one behavior-level automated test covers either filtering the list by status or successfully creating a session. The test exercises that user-visible behavior.

## Constraints

- Use this repository's React and TypeScript application, npm, and the existing `dev`, `build`, `lint`, and `preview` scripts.
- No mock mechanism and no test script exist yet. A conventional HTTP mock is acceptable because the repository has none. Choosing the mock and the test runner is a planning decision.
- Do not rewrite unrelated code or configuration.
- Do not add behavior outside the required flow.
- Later verification must report incomplete behavior honestly, including a real manual pass through the list, filter, and create flow. That check is not part of this requirements artifact.

## Non-Goals

These items are explicitly optional and out of scope:

- session details, drawers, or deep links
- search, other filters, or selecting several statuses at once
- pagination
- a complete API contract or scenario matrix
- desktop and mobile screenshot sets
- exhaustive responsive and accessibility validation
- full test coverage
- CI, deployment, or a public URL
- strict TypeScript migration or unrelated refactoring
- a backend service
- permission and localization behavior beyond `toLocaleString()` display

## Facts

- Task source: `frontend-accelerator-onboarding/TASK.md` in this repository (currently untracked). It is the full scope. `frontend-accelerator-assessment/` was not used.
- This repository is a single Vite, React 19, and TypeScript application at the repository root. The current screen is the Vite starter counter.
- `package.json` has `dev`, `build`, `lint`, and `preview`. It has no test script, test runner, or HTTP mock dependency.
- No living specification, product document, or sessions feature exists in this repository.
- The developer's prompt defines "recoverable" as a list error with retry.
- Developer decisions (2026-10-21): statuses are `scheduled`, `completed`, `cancelled`; the filter is a select with `All` plus each status, one at a time; a new session is `scheduled`; on create success the form closes, the filter resets to `All`, and the session is visible; validation shows on submit, inline under each field; on create failure an inline form error is shown and values are kept; "future" means later than the browser's local current time; start time is shown with `toLocaleString()`; the filter shows only after a successful load; an empty result shows "No sessions".
- The task requires one recoverable list-request error, title validation of a trimmed 3–80 character title, a future date/time, duplicate-submit prevention while create is pending, and the created session in the list.

## Assumptions

- "Between 3 and 80 characters" includes 3 and 80.
- "An empty result shows No sessions" covers both an empty loaded list and a status filter that matches nothing.

## Open Questions

None blocking. Earlier questions 1–10 were answered by the developer on 2026-10-21 (see Facts).

## Gaps

- API shape: no method, path, payload, or error body is specified. A complete contract is optional. `api-integration` owns a contract only if one is requested. The list and create behavior above is the required boundary.
- Visual direction: no design system or layout is specified. `ui-designer` owns that optional work.
- Test tooling: no runner is installed. `writing-plans` owns the choice, using the existing package manager and without adding a backend.

## Readiness

The required list, filter, create, loading, list-error, empty, validation, create-error, and duplicate-submit behavior is ready to plan. Two assumptions remain; confirm or correct them before planning if either is wrong.

Next required role: `writing-plans`.
