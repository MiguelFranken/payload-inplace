# Inline editing across browser engines

Run `corepack pnpm test:e2e:inline-engines` after building the workspace
package and installing Chromium, Firefox and WebKit with Playwright.

The focused suite uses a disposable Payload database, the native save queue and
a real browser selection. Composition events are synthetic so the in-progress
and completion boundaries are reproducible across CI platforms. Ordinary typing,
selection and Escape use Playwright's browser keyboard APIs.

The production transfer and compile benchmark continues to use Chromium CDP
through the regular acceptance configuration.

| Engine | Local runs | Verified behavior |
| --- | ---: | --- |
| Chromium | 2 passed | Plaintext typing, save after composition, selection through save, Escape returns focus to the page |
| Firefox | 2 passed | Plaintext typing, save after composition, selection through save, Escape returns focus to the page |
| WebKit | 2 passed | Plaintext typing, save after composition, selection through save, Escape returns focus to the page |

Local evidence used Playwright 1.58.2 on macOS against the Turbopack demo and
disposable Mongo. Native keyboard IME integration is outside this browser-event
fixture.
