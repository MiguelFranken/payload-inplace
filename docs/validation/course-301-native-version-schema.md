# COURSE-301 · Native version comparison schema

Chromium opened the same historical revision against the same current draft in website history and native admin. Both surfaces showed three matching change rows, including a custom text label, an atomic JSON value and a changed upload reference inside a nested, registered block. The comparison matched each row’s path, labels and before and after values. The editor account could not see the admin-only field in either view.

The test used keyboard activation in the desktop website editor and opened native admin at 320 CSS pixels with reduced motion. It passed on Payload 3.94.0 with disposable PostgreSQL and Next.js Turbopack.

Workspace typecheck, the packed package boundary check and 26 focused document-diff tests passed.
