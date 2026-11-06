# Isolated protected preview and native forms

Use an explicit authenticated admin action to activate a short-lived document-scoped context. The protected preview route shares server renderers with published routes, while public layouts import no editor clients. This avoids relying on dynamic-import splitting across Server Components.

The plugin composes existing document controls and uses the existing Form. Native field ownership is singular; no separate mutation API or autosave engine. Adapter-sensitive code stays in one module. Saved server rendering is authoritative.

Initial tested target: same-origin collections with Payload/UI 3.91.0, Next 16.4.2, React 19.2.6. Compatibility and performance claims require executed gates. Concurrency and real consumer acceptance are release gates; see [current compatibility](../compatibility.md) and [validation evidence](../validation.md).

The original isolated route remains available for integration and regression fixtures. [ADR 0006](0006-same-page-editing.md) adds same-page activation through an internal rewrite under the shared website layout; users keep the public URL.
