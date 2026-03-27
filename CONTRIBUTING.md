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
