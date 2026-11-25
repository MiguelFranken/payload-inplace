# COURSE-298 · Native collection restore locale

Chromium ran the same restore test on Payload 3.91.0 with React 19.2.4 and on Payload 3.94.0 with React 19.3.1. Each run used a separate disposable PostgreSQL database and Next.js Turbopack.

The German comparison showed the current and historical German titles. A caption present in the current German draft and absent in the historical German version appeared as a removal. The historical English caption did not fill the missing translation. The review identified English and German as the restore scope.

Keyboard activation at 320 CSS pixels with reduced motion sent a native POST with `draft=true`, `locale=de` and fallback disabled. The document reopened in German. Both draft readbacks contained their historical title at the next revision. The German caption remained absent. Both published readbacks matched their original values.

The workspace typecheck and packed package boundary check passed on the default workspace pins.
