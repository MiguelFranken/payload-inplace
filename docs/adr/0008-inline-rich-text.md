# 0008: Native-backed inline Lexical ownership

Status: implemented first slice; broader rich-text acceptance remains tracked in COURSE-240.

Payload v3.91 represents its standard Lexical field as `customComponents.Field`. That flag alone cannot distinguish a native rich-text adapter from a consumer replacement. The server walks the actual sanitized fields with Payload's `getFieldPaths`, projecting only native Lexical capabilities without modifying server/client schema cache identity. An explicit consumer Field override retains the native panel.

The activated client resolves one strategy from effective permissions, conditions, row intent, field shape and the projected capability. Native `useField` remains the data owner. Rich-text runtime code is lazy-loaded on the first compatible terminal selection and lives in a private workspace package pinned to Payload's Lexical 0.50.0 runtime. There is no second save queue.

A normal-flow twin receives the rendered element's tag/classes. React's original element stays mounted and hidden with a generated prefixed utility. Lexical owns only the twin's DOM. A lifetime-scoped geometry registration keeps the original selection identity's perimeter on the visible twin. The preview guard retains the server/client tree until inline ownership ends. Disposal removes the twin, restores visibility and releases the guard before native settings mount. This avoids handing React a child tree mutated by a second renderer. Consumer selectors based on element IDs or sibling position should use native panel editing until an explicit renderer adapter exists.

JSON is not converted to plaintext/HTML for persistence. Existing Payload link fields and IDs survive. Unknown custom/upload nodes are immutable islands retaining their complete JSON through unrelated edits; their own editing stays in native settings. Existing arbitrary HTML is never injected into an island. New pasted anchors permit explicit HTTP(S), mail, telephone, local paths and fragments; script/data/protocol-relative/control-character URLs are rejected. Formatting controls respect enabled native features and configured heading sizes. Internal relationship-link selection stays in the native editor for now.

Headless state tests cover metadata/custom node preservation and initialization without writes. Actual browser tests cover focus, structured draft read-back, page chrome/URL retention and handoff to native settings. DOM selection/IME/paste/undo and installed-consumer acceptance need the real browser, not happy-dom emulation.
