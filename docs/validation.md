# Validation: current evidence and how to verify your host

Package builds, source tests, installed-archive acceptance, public npm availability and consumer deployment are separate facts. The [current machine-readable receipt](validation/workshops-release.json) records exact identities rather than treating a green demo as proof of a deployed consumer.

## Release evidence

Use the current receipt for the exact package version, source commit, archive digest and CI links. It also records which acceptance ran in Workshops. Previous public release receipts remain alongside it so regressions can be traced to a known archive.

## Match the check to the change

| Check                                        | Establishes                                                                      | Does not establish                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Typecheck, Oxlint/ESLint, API/link freshness | Source/declaration and documentation contracts                                   | Browser appearance, saves or database races                     |
| Vitest domains/components                    | Policy, identity, queue scheduling and ownership transitions                     | Real caret, native field preparation or concurrent transactions |
| Real PostgreSQL native tests                 | Access, validation, revision races and transaction behavior                      | Your deployed cache/CDN behavior                                |
| Production browser cases                     | Real selection, native controls, slow saves, structure and review                | Every browser/device or arbitrary renderer                      |
| Exact installed consumer                     | Public package entrypoints, peer install and native flows without source aliases | A different application's integration                           |
| Your host's focused acceptance               | Its bindings, rendering, permissions, saving and publication                     | Unexecuted routes or a full-suite claim                         |

Run commands from [Contributing](../CONTRIBUTING.md#validate-changes), and the [test-kit guide](testing-and-extensions.md). Keep credentials/private draft content out of fixtures and screenshots. Record source SHA/dirty state, exact package hash, environment, selected cases, passed/failed/skipped counts and original media. Include public/inactive negative checks alongside an active positive control.

## Find CI evidence

The `validate` check requires all three lanes to pass. GitHub Actions uploads reports as separate artifacts from the same run.

| Lane | Artifact | Evidence |
| --- | --- | --- |
| Source and Storybook | `validation-source` | Unit coverage and component checks |
| Native Payload and browser | `validation-native` | Database integration, production browser and public delivery checks |
| Packed consumer | `validation` | Package archive and installed-consumer checks |

The release workflow reads the `validation` artifact from a successful main run. Keep that artifact name and archive layout stable.

The default Postgres browser run writes to `test-results/results.json` and
`test-results/browser/`. The CI MongoDB smoke test sets
`VE_BROWSER_ARTIFACTS=mongo` to keep its report, traces, and screenshots under
`test-results/mongo/`.

## Keep validation reproducible

Keep enforced thresholds and release receipts in source control. Put transient reports, screenshots and traces in CI or review artifacts. Keep [product screenshots](images/README.md) in the repo because the README uses them. The [performance methodology](validation/performance/README.md) explains the two budget checks.

Earlier implementation logs and raw captures remain available in the [historical source snapshot](https://github.com/MiguelFranken/payload-inplace/tree/ba333f88b0bc6cdf4f630e224156e24534cc3abc/docs/validation).
