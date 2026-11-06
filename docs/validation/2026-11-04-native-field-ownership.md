> Historical milestone snapshot. Version, test counts, pending gates and release holds below describe that dated run. See the [current release/consumer receipt](workshops-release.json) and the [documentation index](../README.md) for current status and setup.

# Native field ownership through Suspense

A native upload chooser intermittently disappeared after reopening. Instrumentation showed no unexpected modal-close action, while the upload button itself was replaced. A custom native field can suspend an already mounted tree; React runs layout-effect cleanup while hiding that tree. Releasing the field claim from that cleanup removed the only owner and unmounted the native controls.

Ownership is now released by passive cleanup on unmount rather than a Suspense layout cleanup. Selection-relative claims move atomically; overlapping owners still wait, and unchanged claims retain reference identity.

## Controlled regression

The test-only `NativeSuspensionProbe` is registered in the demo native caption field and enabled only by the isolated e2e wrapper. It never ships in the package. With the upload chooser open, the regression triggers one controlled suspension and requires the drawer, its media result, and the original upload button DOM node to survive. It also closes/reopens the drawer and verifies that no document revision or unrelated value changed.

- Before: the exact test failed after suspension because the open drawer disappeared.
- After: the same controlled test passed with the ownership fix.
- Earlier focused stress run: twelve consecutive native chooser reopen flows passed with passive ownership cleanup.
- Focused static checks and all 108 unit tests passed, including unchanged claims, competing ancestor/descendant owners, neighboring rows, and selection-relative moves.

All 45 local production browser tests and the public production graph check passed with the fix. The canonical CI archive and installed-consumer acceptance provide the subsequent release gate; this diagnostic evidence alone is not publication or deployment evidence.
