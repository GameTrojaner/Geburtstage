# Contributing

Thanks for contributing to Geburtstage.

## Inbound licensing

By submitting a contribution, you agree that your contribution is licensed under the same terms as the project (`GPL-3.0-or-later`).

## Patent policy

All contributors are bound by the patent non-assert commitment in `PATENTS.md`.

## Development checks

Before opening a PR, run:

```bash
npm run test:typecheck
npm test -- --runInBand
npm run fdroid:check
npm run licenses:check
```

## Releases

Every PR merged into `main` automatically triggers a build and a new GitHub Release (fix/patch bump by default).

To request a different bump level, add a keyword anywhere in the PR body:

| Keyword | Example result |
|---------|----------------|
| _(none)_ | `1.0.2 → 1.0.3` |
| `[minor]` | `1.0.2 → 1.1.0` |
| `[major]` | `1.0.2 → 2.0.0` |

For a specific version (e.g. cutting `1.0.0` stable from a beta series), trigger the workflow manually: **Actions → Release → Run workflow → custom_version: `1.0.0`**.

### Starting a new major beta series (e.g. `2.0.0-beta.1`)

If the current stable release is `1.x.y` and you want to start a `2.0` beta:

1. Manually trigger the release: **Actions → Release → Run workflow → custom_version: `2.0.0-beta.1`**
2. Subsequent PR merges auto-bump: `beta.2`, `beta.3`, …
3. When ready to ship stable: **Actions → Release → Run workflow → custom_version: `2.0.0`**

> Note: this workflow is linear — it assumes `main` is the single release branch. Parallel maintenance of a `1.x` patch series alongside a `2.0` beta requires a separate `v1` branch, which is not currently set up.
