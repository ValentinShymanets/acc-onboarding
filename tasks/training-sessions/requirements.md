# training-sessions: Training Sessions Workspace

## Goal

A trainer can open one workspace, see training sessions loaded from a mock API, filter them by one status, and create a session with a title and a future date/time so that the new session appears in the list.

## Users And Outcome

The user is a trainer. The outcome is a small workspace for viewing, filtering, and creating training sessions. The exercise is limited to that flow.

## Acceptance Criteria

### List

- [ ] Opening the workspace loads sessions through a replaceable request boundary and shows each session's title, status, and start date/time.
- [ ] While the list request is pending, the workspace shows a loading state and does not present the list as ready.
- [ ] If the list request fails, the workspace shows one understandable error and a way to request the list again from that state.
- [ ] A successful retry clears the error and shows the sessions returned by that successful request.
- [ ] The loaded list can be viewed as `All` or narrowed to exactly one status.
- [ ] `All` shows every loaded session. The status filter shows only sessions with that status.
- [ ] The loaded data includes at least one session that matches the filter status and one that does not, so `All` and the status filter show different results.

### Create

- [ ] The trainer can open a create form from the workspace.
- [ ] The form collects a title and a date/time.
- [ ] A title is invalid when its trimmed length is under 3 or over 80 characters, including a title that is only whitespace. Submitting it does not create a session and shows a validation message for the title length rule.
- [ ] A missing date/time, or a date/time that is not in the future, does not create a session and shows a validation message that a future date and time is required.
- [ ] A valid submission sends one create request through the same replaceable request boundary.
- [ ] While that create request is pending, another submit does not send a second create request.
- [ ] After a successful create, the new session appears in the list with the submitted title and start date/time.

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
- search or more than one status filter
- pagination
- a complete API contract or scenario matrix
- desktop and mobile screenshot sets
- exhaustive responsive and accessibility validation
- full test coverage
- CI, deployment, or a public URL
- strict TypeScript migration or unrelated refactoring
- a backend service
- permission, localization, and empty-state behavior beyond the open questions below

## Facts

- Task source: `training/frontend-accelerator-onboarding/TASK.md` in the accelerator toolset. That folder is not present in this repository. The assessment folder was not used.
- This repository is a single Vite, React 19, and TypeScript application at the repository root. The current screen is the Vite starter counter.
- `package.json` has `dev`, `build`, `lint`, and `preview`. It has no test script, test runner, or HTTP mock dependency.
- No living specification, product document, or sessions feature exists in this repository.
- The task requires one recoverable list-request error, title validation of a trimmed 3–80 character title, a future date/time, duplicate-submit prevention while create is pending, and the created session in the list.

## Assumptions

- "Between 3 and 80 characters" includes 3 and 80.
- "Recoverable" means the trainer can request the list again from the error state without restarting the application.

## Open Questions

These are unresolved. Do not treat an answer as a requirement until a developer decides it.

1. Which status is the single filter value, and what statuses can a session have?
2. What status does a newly created session receive?
3. If the active filter would hide that status, must the new session still be visible, or only when `All` or a matching filter is selected?
4. What, if anything, is shown when the loaded list is empty or the active filter matches nothing?
5. Are validation messages shown only on submit, or also earlier?
6. What happens when a create request fails after validation has passed? A recoverable error is required for the list request only.
7. After a successful create, does the form close, clear, or remain as submitted?
8. Is "in the future" judged against the trainer's local clock, and is the current minute still invalid?
9. How is the start date/time displayed?
10. Are the filter controls present during loading and list error, or only after a successful load?

## Gaps

- API shape: no method, path, payload, or error body is specified. A complete contract is optional. `api-integration` owns a contract only if one is requested. The list and create behavior above is the required boundary.
- Visual direction: no design system or layout is specified. `ui-designer` owns that optional work.
- Test tooling: no runner is installed. `writing-plans` owns the choice, using the existing package manager and without adding a backend.

## Readiness

The required list, filter, create, loading, list-error, validation, and duplicate-submit behavior is ready to plan. The open questions are not implied requirements.

Next required role: `writing-plans`.
