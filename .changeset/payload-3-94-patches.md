---
"payload-inplace": patch
---

Accept every aligned Payload 3.94.x patch release. Peer dependencies now allow `3.91.0 || ~3.94.0`, and `withVisualEditorNext` accepts any 3.94.x version when `payload`, `@payloadcms/ui` and `@payloadcms/next` share that exact version. Consumers on Payload 3.94.1 or 3.94.2 no longer fail during install or Next configuration. The workspace and installed-consumer checks now validate Payload 3.94.2.
