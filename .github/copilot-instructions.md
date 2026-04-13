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

Do not finish the task while known review findings remain unresolved.
