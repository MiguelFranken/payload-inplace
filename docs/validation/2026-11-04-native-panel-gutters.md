> Historical milestone snapshot. Version, test counts, pending gates and release holds below describe that dated run. See the [current release/consumer receipt](workshops-release.json) and the [documentation index](../README.md) for current status and setup.

# Native field panel gutters

The native Payload 3.91 admin uses a 60px page gutter at desktop widths. Its small-screen collapsible styles use that gutter as row padding. Our isolated field CSS correctly follows the floating panel's container width, but its inherited gutter still followed the website viewport. A narrow panel on a desktop therefore received 60px row padding. Top-level groups also used negative margins derived from that gutter against a 16px panel inset. Codex browser measured a 358px scroll area with 402px of content: 44px unwanted horizontal overflow.

The floating body now provides a local gutter equal to its padding, defaulting to Payload's native 20px base. The `--pve-panel-padding` variable adjusts both together. Native RenderFields uses `margins="small"`, matching Payload's block-row implementation. Native controls and their responsive styles remain intact; the fix does not conceal overflow with horizontal clipping or change website styles.

Verification:

- Codex browser compared native admin and frontend fields at a 1440px viewport. Array row padding changed from 60px to the native admin's 20px. The panel's scroll width now equals its client width, including after resizing.
- The new real-browser test exercises nested groups, an expanded array, relationship/upload controls, a 360px panel, a panel wider than 800px, and a 320px viewport. It checks admin padding parity, actual scroll geometry and field DOM identity.
- Existing native input-scale/resizing and streamed-preview ownership regressions pass. TypeScript, build and both lint gates pass; existing hook-dependency migration warnings remain visible.
- The demo can use `VE_NEXT_DIST_DIR` for a separate Next cache when another local test server must remain running.

These are local checks, not release or deployment evidence. No push is authorized.
