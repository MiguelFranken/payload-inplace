# Validation and remaining gates

Evidence must distinguish code, installed artifact, running integration, reviewed UI, registry release and production deployment.

Initial baseline: Payload/UI 3.91.0, Next 16.4.2 with explicit Turbopack, React/DOM 19.2.6, pnpm 10.28.0. Node 26 is the current local runner; Node 24 CI is configured separately and is not yet claimed as executed evidence.

Verified so far: pure path/identity/protocol/signature tests; real Mongo draft/publication and authorization integration; declarations and separate package entry build; packaged CSS/client directives; transitive public binding graph; extracted clean binding consumer. The first browser milestone is in progress.

Remaining release blockers include atomic concurrent-write protection for ordinary CMS and visual saves; publish review/barrier; scoped structural history; current-session revocation; native media/Lexical browser evidence; production import/resource and performance baselines; a second real clean consumer; three Workshops integration passes; public registry installation and rollout/rollback proof.

Do not use this document to waive failed data-loss, authorization or core editing gates.
