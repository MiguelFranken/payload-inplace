# Repository tests

- `browser/` exercises the running storefront with Playwright. Playwright starts
  the same demo app against disposable data. Documentation captures use the
  separate `docs:media` command.
- `integration/` exercises native Payload operations with the demo schema.
  Run it with `corepack pnpm test:int` after building the package.
- Package unit tests live next to their packages. The
  [installed-consumer fixture](../fixtures/installed-consumer/README.md) checks
  the packed npm artifact independently of the workspace link.

See [Contributing](../CONTRIBUTING.md#validate-changes) for the full commands.
