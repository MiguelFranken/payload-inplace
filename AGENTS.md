# Payload Inplace

Generic editing, preview protocol, schema adapters and tests belong here. Consumers own renderers, authorization policy and business constraints.

- Use Conventional Commits. Run typecheck after TypeScript changes.
- Keep one native Payload Form and persistence queue. Preserve unknown/unmounted values.
- User-driven Local API calls explicitly use overrideAccess:false and the current user.
- Public routes must import no editor clients or styles. Protected preview requires current authorization and explicit activation.
- Use shadcn Base UI primitives for frontend editor chrome. Native Payload field adapters retain Payload UI controls. Inspect upstream exported APIs before changing adapters.
- Validate package output and real Payload/browser behavior before consumer integration. Use explicit Turbopack and isolated temporary databases.
- Never commit credentials or private consumer data. Report incomplete acceptance honestly.

## Interface implementation

Use the local `.agents/skills/better-interface/SKILL.md` and its six owning skills when creating or reviewing editor UI. Validate complete flows at desktop and 320px widths, with keyboard and reduced motion. Keep review evidence in `docs/validation`.

Use Tailwind utilities exclusively for plugin and demo presentation. CSS inputs contain Tailwind directives only; generated CSS is build output. Do not add handcrafted selectors, CSS-in-JS, or static inline styles. Runtime geometry may set narrowly scoped CSS variables. Package prefixed utilities without Preflight; native Payload controls retain their styles. Use `--pve-*` semantic variables with Payload theme fallbacks for consumer customization.
