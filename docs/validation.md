# Validation: current evidence and how to verify your host

Package builds, source tests, installed-archive acceptance, public npm availability and consumer deployment are separate facts. The [current machine-readable receipt](validation/workshops-release.json) records exact identities rather than treating a green demo as proof of a deployed consumer.

## Released baseline: 0.0.9

[Canonical CI](https://github.com/MiguelFranken/payload-inplace/actions/runs/42084863609) validated runtime source `ea24e121f8c93d7e13049435ff73d19fdac5688f`: 255 unit/component tests in 82 files, 77 production browser cases and 13 PostgreSQL native cases. Mongo ran 5 applicable native cases with 8 transaction-specific skips, plus 1 review browser case. The independent installed consumer passed 5 enabled and 3 disabled baselines, with 2 intentionally disabled authoring skips.

[OIDC publication](https://github.com/MiguelFranken/payload-inplace/actions/runs/42089746843) published the exact archive. The receipt separately records the public registry hash/provenance and the Workshops feature preview's focused acceptance. Neither establishes production rollout for another host. New documentation/demo work is validated separately and does not retroactively change these immutable results.

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

## Current documentation and demo review

[November 6 documentation audit and visual review](validation/2026-11-06-docs-and-demo.md) records the 50-file existing-docs audit, six new high-density captures, responsive production-browser checks and explicit limits. It does not replace runtime release acceptance.

## Historical records

[Dated alpha ledger](validation/2026-11-03-validation-ledger.md) · [Roadmap implementation checkpoints](implementation/roadmap.md) · [Per-ticket acceptance](validation/linear-acceptance/README.md) · [Performance method](validation/performance/README.md). Historical “pending”, no-push and unsupported-feature statements are not current installation instructions.
