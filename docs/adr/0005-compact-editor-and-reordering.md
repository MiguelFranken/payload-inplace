# Compact frontend dock and native block reordering

The owner rejected the previous wrapping toolbar and independent floating windows. The frontend editor now uses a horizontal dock, a secondary tools menu and exactly one contextual panel. The website remains the primary workspace. Plain text edits stay inline; options are secondary.

## Component foundation

The button, select and dropdown menu wrappers in `src/frontend/ui` adapt the official shadcn Base Nova registry sources, using `@base-ui/react` 1.9.0. Their anatomy and keyboard/focus ownership remain Base UI. Registry utility styling is adapted to prefixed Tailwind without Preflight, consumer semantic variables, and the editor shadow root. Portal containers belong to that root so menu content cannot escape its stylesheet or stacking context. No Radix dependency was added for editor chrome. Existing native Payload complex field widgets retain their own implementation and dependencies. Upstream MIT attribution is in `NOTICE`.

Registry sources retrieved 2026-11-03:

- https://ui.shadcn.com/r/styles/base-nova/button.json
- https://ui.shadcn.com/r/styles/base-nova/select.json
- https://ui.shadcn.com/r/styles/base-nova/dropdown-menu.json

## Progressive disclosure

Direct editing is active immediately after the one-click native POST launcher, and stays active between selections. Selecting a heading focuses the existing website text; no mode needs to be rearmed. The compact dock exposes Edit and Sections, retaining those labels even at 320px. Page details, appearance, consumer controls/actions, manual save, history and exit live in the More tools menu. Opening a panel replaces the prior contextual panel; field values remain in the single native Form. Consumer panel width is retained. A minimized Edit page button remains at the bottom right; public pages continue to use the zero-JavaScript authorized launcher, without an intermediate entry menu. Section rows derive names from readable native text schema/value state, preferring explicit block names and heading/headline/title conventions before the block type. Hidden, denied, unknown and conditionally inactive fields are excluded. Clicking a row jumps to editable text; its separate settings button opens native fields. A back button returns to Sections. Fixed-first rows expose a lock and “Fixed first”; the add picker filters disallowed singleton/ordering choices instead of offering predictable errors.

Draft status distinguishes unsaved, saving, confirmed and failed states with text on desktop and distinct named icons at narrow widths. Review remains disabled until native persistence acknowledges the draft. The UI cannot claim a successful save based on optimistic rendering.

The section list and open native-field panel expose a separate “Show on page” action. It scrolls the rendered union for fragment/display:contents bindings, leaves selection and field ownership unchanged, respects fixed/sticky headers and reduced motion, and never writes to the Form. Missing renderer bindings report an unavailable target instead of jumping to an unrelated node.

Native-field panels resize from their top and left edges while remaining anchored above the dock. Pointer capture and keyboard separators update only panel geometry, retain the mounted native field tree, and clamp to the current viewport. Native Payload rem-based styles use the island's own admin scale and width queries use its container, so website root typography and viewport width cannot distort native inputs or rows.

## Reordering

Both surfaces use the same `applyCommand` move operation: resolve source and destination scoped row identities against the current native Form, require the same blocks field, apply its permissions/min/max and consumer structural policy, take one history checkpoint, and invoke native `moveFieldRow`. Pointer movement never changes FormState and therefore never schedules an intermediate autosave. A cancelled or same-position drop has no history entry. Cross-container movement is deliberately rejected because it changes schema ownership.

The section list uses dnd-kit sortable rows. On-page handles bind to existing `data-ve-block` elements, without adding consumer framework wrappers or an independent page tree. Measured page controls choose a position that does not cover rendered field text, including neighbouring sections. All controls share one text measurement per animation frame. When a dense layout leaves no safe space, the list retains the complete pointer/keyboard path. The actual site content stays stable until drop; a drop line communicates the destination. Keyboard destinations follow explicit sibling row order; collision detection honors that identity while centered coordinates handle scrolling. Overlay size and variable-height fragment roots cannot reverse an arrow-key move. Pointer sensors require six pixels of travel; handles support Space, arrow keys and Escape. Up/down buttons remain an alternative in section settings. Undo and redo sit in the Sections header. Announcements use section labels and positions, not raw JSON identities. No drop animation is required; motion utilities respect reduced motion.

## History and recovery

Structural history records the affected operation and stable native row identities. Undo moves/removes/restores only the affected row, resolving its current parent from ancestor IDs and retaining later native text edits, nested field changes and unrelated rows. It does not restore the old document wholesale. A disappeared parent or moved row reports a conflict instead of targeting whichever row now occupies the old index.

Ctrl/Cmd+S uses the same native background submission as autosave, preserving focus and newer typing. Escape closes contextual settings while keeping direct editing available. Confirmation follows native persistence; optimistic preview never reports a successful save by itself.

Expiry freezes edits and keeps a token-free working-copy download. “Reopen editor” explicitly calls the existing current-auth activation endpoint and navigates to a fresh context/latest saved draft. Unsaved work requires a download/discard confirmation. Denied reactivation retains the current form and offers sign-in in another tab; it never bypasses current permissions or silently carries an unsaved document into a new form. Cold invalid links show an actionable recovery page without draft output.

## Validation boundary

The focused synthetic browser flow checks list pointer dragging, on-page pointer/keyboard dragging, native persisted row IDs, undo, cancellation, a rejected hero-first move, and no write during a drag held longer than the demo autosave interval. It also renders the section picker and 320px dock. Final production and accessibility results belong in the validation report; this ADR alone is not release acceptance.
