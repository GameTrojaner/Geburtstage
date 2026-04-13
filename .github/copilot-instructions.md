# Copilot Working Agreement (Geburtstage)

Use this workflow for every coding request in this repository.

## Mandatory rules

1. Keep scripts, docs, and tests up to date with each change.
2. Every production code change must be covered by at least one test update or new test.
3. If tests fail, fix the issue in the same task before finishing.
4. Keep changes minimal and focused on the request.

## Command checklist to run on every prompt

Run these commands in order unless the task is purely non-code:

```bash
npm run test:typecheck
npm test -- --runInBand
```

For Android-impacting changes, also run:

```bash
npx expo run:android
```

## Documentation checklist

When behavior, setup, architecture, or developer workflow changes:

- Update README.md
- Update PROJECT_CONTEXT.md
- Update setup scripts if install/build assumptions changed

## Test coverage checklist

For each changed source file in src/:

- Add or update a test in __tests__/
- Verify assertions cover the changed behavior (happy path + failure/fallback path when relevant)

## Failure handling

If any command fails:

1. Investigate the root cause.
2. Apply a fix.
3. Re-run typecheck and tests.
4. Repeat until green.

## End-of-implementation workflow (mandatory)

At the end of every implementation task (before handoff/merge), perform this workflow:

1. Run a self-review of the full diff and identify concrete risks/regressions.
2. Fix all issues found during self-review in the same branch/task.
3. Re-run validation commands (`npm run test:typecheck`, `npm test -- --runInBand`, and Android checks when relevant).
4. Update docs/tests as needed for any additional fix from self-review.
5. Post or prepare a concise PR review template including:
	- scope summary,
	- risk level,
	- validation run,
	- reviewer checklist,
	- rollback plan.

## PR findings workflow (mandatory)

When asked to review or address PR findings/comments:

1. Process findings one by one and keep a clear decision for each finding.
2. For each finding, set the PR/discussion state appropriately (e.g., resolve when fixed, keep open when pending, mark as not planned when intentionally rejected).
3. For each finding, add a short follow-up comment documenting what was done:
	- fixed (with commit/reference),
	- not reproducible (with evidence),
	- intentionally not applied (with rationale),
	- needs more info (specific blocker/question).
4. Do not leave processed findings without state updates and explicit comments.

Do not finish the task while known review findings remain unresolved.
