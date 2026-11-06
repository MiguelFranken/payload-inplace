# Domain quality gates

Run `pnpm test:coverage` for all pure domains and React component contracts. `pnpm test:domain unit:plugin:security` selects one domain; `pnpm test:components` selects native ownership and disclosure fixtures. Database integration is a separate serial project with its own timeouts. Browser tests retain geometry, native form, selection, composition and concurrency behavior that a DOM simulation cannot establish.

All 40 previous suites were relocated, not removed: bindings, commands, persistence, security, native, geometry, consumer and packaging live under the public facade's tests. Framework-free readiness/path tests belong to core; Lexical JSON/node tests belong to lexical. Turbo runs each workspace's unit project once. Coverage runs directly rather than serving a cached external acceptance result.

The historical first domain baseline after the November 4 migration is 156 assertions in 42 files, 2.04s Vitest wall time on the local Node 26 runtime. Domain source coverage is 76.60% statements, 72.53% branches, 80.12% functions, 78.93% lines. These figures include core, Lexical runtime and facade state/schema/server/adapters; they do not measure every React view. Critical revision, access, review and binding branches have higher file-specific floors. Database-only Postgres behavior and low-level DOM geometry are intentionally still in this denominator, even where unit coverage is low. Real integration/browser gates complement these gaps. This is a measured starting floor, not a claim of complete coverage.

The JSON timing report is `test-results/unit-domains.json`; HTML, lcov and JSON summary coverage are under `test-results/coverage`. CI runs the same coverage command. Compare identical inputs and runtime before claiming a speed improvement. Turbo includes Node's exact runtime version, root package scripts, workspace manifest and lockfile in deterministic task hashes; browser/database/archive acceptance remains uncached.

## Lint responsibilities

| Responsibility                                                | Gate                                  | Policy                                                                                    |
| ------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| JavaScript/TypeScript correctness, debugger, React hook calls | Oxlint 1.91                           | Errors; real source, demo and scripts included                                            |
| Accessible names on controls                                  | Oxlint jsx-a11y                       | Errors; deliberate unnamed/labelled control fixtures prove both outcomes                  |
| Hook dependency migration                                     | Oxlint                                | Visible warnings; no blanket effect remounts that would discard native caret ownership    |
| Existing TypeScript recommended rules                         | ESLint                                | Retained until explicit migration; no silent rule removal                                 |
| Typed unhandled promises                                      | ESLint typescript-eslint              | Errors in core, Lexical, server and native controllers; deliberate floating/void fixtures |
| Framework/native dependency direction                         | AST boundary gate                     | Resolves static, lazy and type edges; tests include comments and transitive leaks         |
| Inert bindings graph                                          | AST transitive gate + packed consumer | No native/editor/package dependency, including type-only edges                            |
| Type compatibility                                            | TypeScript 5.9                        | Independent gate; no TS7 upgrade solely to adopt type-aware Oxlint                        |

React compiler rules are disabled because the project does not enable React Compiler and intentionally synchronizes native Payload/DOM state. Existing documented status-tooltip/scroll-region tab stops retain their narrow accessibility exception. No rule is silently mapped to a weaker equivalent. The narrow typed ESLint pass uses the real project service; ordinary Oxlint does not claim type-aware enforcement.

References: [Oxlint usage](https://oxc.rs/docs/guide/usage/linter), [migration](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html), [type-aware prerequisites](https://oxc.rs/docs/guide/usage/linter/type-aware.html), [typed promise rule](https://typescript-eslint.io/rules/no-floating-promises/).

## Measured lint cost

Three serial same-input runs compare the pre-roadmap ESLint recommended configuration (only moved/generated ignores adapted) with the new checks. Median process-inclusive times were 1,357ms for legacy ESLint, 717ms for Oxlint and 3,866ms for retained ESLint with typed promise checks. The combined gate is stronger and slower; no speedup is claimed. `docs/validation/performance/lint-timings.json` retains the exact samples and method. Removing retained rules merely to make these numbers smaller is not allowed.
