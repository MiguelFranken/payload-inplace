# COURSE-299 · Timeline pagination

Chromium compared a page-one version before requesting page two. While the page-two response was held, the previous rows and comparison disappeared. A late activation of the old row and a repeated keypress sent no detail request and did not cancel the page read.

A simulated 503 left page two selected and exposed Retry. Retrying loaded the real page-two row. Rapid keyboard navigation between completed pages kept the page indicator, rows and selected comparison in sync.

The test exercised the delay and retry at 320 CSS pixels with reduced motion, then rapid navigation at desktop width. It and the existing website restore flow passed against Payload 3.94.0, disposable PostgreSQL and Turbopack. Workspace typecheck and the packed package boundary check passed.
