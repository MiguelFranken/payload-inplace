# Domain quality gates

Run `pnpm test:coverage` for all pure domains and React component contracts. `pnpm test:domain unit:plugin:security` selects one domain; `pnpm test:components` selects native ownership and disclosure fixtures. Database integration is a separate serial project with its own timeouts. Browser tests retain geometry, native form, selection, composition and concurrency behavior that a DOM simulation cannot establish.

Run `pnpm test:domain unit:ui` for the Vitest contracts in `packages/ui/tests`. Put UI interactions that need the real browser and Storybook decorators in the colocated `*.stories.tsx` files as `play` functions. Run `pnpm test:stories` for those Chromium tests, or run `pnpm build:storybook` followed by `pnpm test:storybook` to include checks of the static build and narrow-viewport keyboard behavior. The Storybook app owns its browser-mode configuration and the `tests` workspace owns the static smoke suite.

Bindings, commands, persistence, security, native, geometry, consumer and packaging live under the public facade's tests. Framework-free readiness/path tests belong to core; Lexical JSON/node tests belong to lexical. Turbo runs each workspace's unit project once. Coverage runs directly rather than serving a cached external acceptance result.

Coverage includes core, Lexical runtime and the plugin's state, schema, server and adapter modules. Critical revision, access, review and binding branches have higher file-specific floors. PostgreSQL integration and browser tests cover behavior that unit coverage cannot establish.

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
