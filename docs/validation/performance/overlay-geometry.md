# Canvas handle geometry on a long page

Run the benchmark from the repository root after building the package.

```sh
VE_PRODUCTION=1 VE_BROWSER_ARTIFACTS=overlay-geometry \
  corepack pnpm test:overlay-benchmark --repeat-each=3
```

The test creates a native Payload page with 72 deterministic sections and
504 bound field elements. It opens the active editor's Sections panel and
samples 30 evenly spaced scroll positions. The Playwright report attaches
`overlay-geometry.json` for each run, including measurements at every position.

The harness counts full bound-field queries and calls to `Range.getClientRects`
and `Element.getClientRects` between the scroll and second animation frame.
Element reads include section and nested element geometry. The counters exclude
other APIs such as `offsetWidth` and `getBoundingClientRect`. Handle checks run
after the counters are sampled and verify the visible grip's horizontal
placement and its anchor against the corresponding section. The timings are
requestAnimationFrame intervals with the editor and instrumentation running.

## Local production baseline

Chromium 145.0.7632.6, Playwright 1.58.2, Node 24.22.3, macOS 26.7.3 arm64,
production Turbopack with a disposable Mongo database. Three runs per viewport.

| Viewport | Fields | Field passes per run | Range / element reads per step, p50 | First frame, p95 | Frame interval, p50 | Frame interval, p95 | Grip checks per run |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440 × 900 | 504 | 30 | 288 / 288 | 8.1–8.2 ms | 8.4–16.6 ms | 16.7–25.0 ms | 71 |
| 320 × 900 | 504 | 30 | 288 / 288 | 8.0–8.2 ms | 8.4–9.2 ms | 16.7–25.0 ms | 67 |

All six runs passed the grip placement checks. The same geometry read count at
both widths confirms that the field pass scales with the document, even when
few fields are on screen. Prototype viewport filtering to test whether it
reduces the 25 ms tail, and compare both widths while preserving neighbouring
text coverage for handle placement. This baseline supports measuring that
prototype before changing the production path.
