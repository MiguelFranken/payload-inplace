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

## npm authentication with 1Password passkeys

Routine releases use the validated archive and GitHub Actions trusted publishing (OIDC), as described in `docs/release.md`. Use an interactive npm CLI session only when owner authentication is required, such as first publication or trusted-publisher configuration.

The working macOS flow is **npm CLI → Firefox → 1Password passkey**. In this setup, 1Password passkey verification repeatedly stalled or expired in the Codex browser; Firefox completed it. Keep Codex browser validation for the app, and use Firefox for the npm authentication handoff.

1. Verify the intended npm identity with `npm whoami --registry=https://registry.npmjs.org`. The owner account is `miguel.franken`; the public package is unscoped `payload-inplace`. If the CLI login expired, start `npm_config_browser=false npm login --auth-type=web --registry=https://registry.npmjs.org` in a persistent TTY session. Never read or print npm tokens.
2. Keep that CLI process alive. Open the **fresh URL printed by that exact operation** with `open -a Firefox '<fresh npm URL>'`. Do not reuse a URL from chat history or an old Codex tab: login and publication checks are separate and expire.
3. Ask the user to complete the security-key/passkey prompt in Firefox using 1Password, then resume/poll the same CLI session. The user performs the passkey interaction; never request their password, OTP, recovery codes, or vault contents in chat. Do not weaken npm security settings to bypass the check.
4. For an authorized first publication, publish the already validated immutable archive, not a fresh repack. The verified CLI shape is:

   ```sh
   npm_config_browser=false npm publish ./release-output/candidate.tgz \
     --registry=https://registry.npmjs.org --access=public --ignore-scripts \
     --tag=latest --auth-type=web
   ```

   A successful login does not guarantee publication authorization. If this operation prints another npm verification URL, repeat the Firefox handoff while keeping this publication process alive.
5. A user confirmation is a cue to inspect the CLI result, not proof of success. Require an exit code of zero and the expected package/version output. If the link expires or the process exits, inspect registry state before retrying, then start a fresh CLI operation and use its new URL. Do not run competing publication attempts.
6. Verify the exact version and dist-tag through the public registry, then anonymously download its tarball and compare integrity/content with the validated candidate. A CLI success followed by a temporary registry 404 is not yet proof that consumers can install it. Distinguish publication acceptance, public availability, CI provenance, and consumer deployment in the delivery report.

For trusted-publisher setup, use the exact repository/workflow/environment identity from `docs/release.md`. Verify a subsequent OIDC release; an owner-authenticated bootstrap must not be described as a CI publication with provenance. Do not commit authentication URLs, credentials, or private account screenshots as release evidence.
