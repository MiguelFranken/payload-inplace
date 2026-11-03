# Candidate release and non-destructive rollback

Public source: [MiguelFranken/payload-visual-editor](https://github.com/MiguelFranken/payload-visual-editor). Distribution policy: public npm, package `@miguel.franken/payload-visual-editor`, anonymous installation. No stable npm publication or application production deployment is represented by this candidate preparation.

## Reproduce an immutable candidate

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit
corepack pnpm test:int
VE_PORT=3137 corepack pnpm exec node scripts/postgres-test.mjs e2e
corepack pnpm test:graph
corepack pnpm exec node scripts/postgres-test.mjs
corepack pnpm release:check
# Commit the candidate source before packing.
corepack pnpm pack:check
corepack pnpm test:consumer
corepack pnpm test:installed-consumer
```

`test-results/package.json` records source cleanliness, SHA and archive checksum. `test-results/installed-consumer.json` records the exact installed archive, peer versions, independent template/lock hashes, active flows and disabled public comparisons. The public validation workflow uploads these with the archive. Install the downloaded archive into Workshops; do not repack it or use a source alias.

Until a registry version exists, install the exact downloaded `.tgz` with `corepack pnpm add /absolute/path/to/candidate.tgz`. Verify its SHA256 against the validation artifact before installation. Public peer dependencies install anonymously from npm; the temporary clean consumer proves that path without private credentials. The source README and demo are executable integration references.

## Manual trusted publication

The `release.yml` workflow defaults to preparation only. It accepts a successful **main push** validation run, exact archive checksum and explicit `next`/`latest` channel. Fork/PR artifacts, dirty source, changed code after validation, mismatched consumer receipts and prereleases tagged `latest` are rejected. A committed `docs/validation/workshops-release.json` must identify the same archive hash, committed application SHA and passed acceptance. Evidence-only updates under `docs/validation` may follow candidate validation without forcing a rebuild of the artifact.

The optional publish job has OIDC permission only in that job, uses the `npm` environment, rechecks the archive checksum, runs no package scripts, and publishes the exact archive with public access and provenance. Configure repository environment protection and npm trusted publishing for owner `MiguelFranken`, repository `payload-visual-editor`, workflow filename `release.yml`, environment `npm` before enabling publication. That account configuration is not established by committing YAML. First publication/bootstrap may require an owner-controlled npm operation if the package does not yet exist.

Use npm >=11.5.1 and Node >=22.14; Node24 is selected here. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/). No long-lived registry token belongs in PR CI. Stable publication requires a non-prerelease version and a new validation/consumer cycle; never relabel an untested build as stable.

## Install, enable and upgrade

1. Keep the existing schemas and renderer. Configure only actual collection/root pairs and attach dependency-free bindings to rendered fields/blocks. Generate Payload's import map after installing the built package. Keep one server Payload runtime (the demo explicitly lists `payload` in Next's `serverExternalPackages`); duplicated bundled/external classes can strip native field-error details. The production draft-validation regression verifies this boundary.
2. Install native revision columns through normal Payload migrations before enabling transactional guards. Review executable migration, generated schema snapshot and migration index as a unit. Existing content is not transformed.
3. Protect the website route and native server functions with fresh authorization; use same-origin private/no-store output. Keep public data published-only. Enable the host flag only in the intended environment.
4. Run the installed package acceptance and warmed public/draft/public security checks. Confirm custom business commands retain their own access/transaction boundary. Uploads are independent asset writes.
5. For an upgrade, pin a new immutable archive/version, retain the previous package and migration history, regenerate the import map and run the same acceptance. Avoid mixing Payload/UI peer versions.

## Disable and rollback

First disable the frontend editor feature flag and restart the serving application. This removes activation/launcher authoring while normal website rendering and the native CMS remain available. Keep the plugin's persistence guards/revision fields installed: runtime disable is not schema removal. Revoke active contexts through the host authorization/expiry path.

If needed, restore the previous tested package and its matching lockfile/import map, then rebuild; retain the additive revision columns and all published/draft content. Do not run down migrations, delete versions or rewrite documents to undo a UI release. An older package must understand the retained revision contract; otherwise use the native CMS with the current guards and the feature flag off. Independent installed-consumer disabled runs prove normal rendering without authoring. Workshops' rollout procedure additionally retains its operational capacity command and historical migration replay mode.

Before production enablement, validate the intended CDN/proxy headers, cookies, HTML/RSC prefetch and any service worker with both warm-cache directions. That deployment is a separate delivery decision, not implied by local release preparation.
