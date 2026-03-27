# F-Droid Metadata Draft

This directory stores the in-repository draft metadata used to prepare F-Droid submission.

## Important

- Official F-Droid metadata lives in the `fdroiddata` repository.
- The `License` field in `com.anonymous.Geburtstage.yml` must be set to a valid SPDX identifier before submission.
- Keep `Summary`, `Description`, and version fields in sync with project releases.

## Suggested submission workflow

1. Update `fdroid/metadata/com.anonymous.Geburtstage.yml` in this repo.
2. Run:
   - `npm run fdroid:check`
   - `npm run test:typecheck`
   - `npm test -- --runInBand`
3. Mirror the metadata into a PR against `fdroiddata`.
