# Payload Visual Editor

Generic editing, preview protocol, schema adapters and tests belong here. Consumers own renderers, authorization policy and business constraints.

- Use Conventional Commits. Run typecheck after TypeScript changes.
- Keep one native Payload Form and persistence queue. Preserve unknown/unmounted values.
- User-driven Local API calls explicitly use overrideAccess:false and the current user.
- Public routes must import no editor clients or styles. Protected preview requires current authorization and explicit activation.
- Use Payload UI primitives and tokens. Inspect upstream exported APIs before changing adapters.
- Validate package output and real Payload/browser behavior before consumer integration. Use explicit Turbopack and isolated temporary databases.
- Never commit credentials or private consumer data. Report incomplete acceptance honestly.
