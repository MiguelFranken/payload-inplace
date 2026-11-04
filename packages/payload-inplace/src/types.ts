import type { PayloadComponent, PayloadRequest } from "payload";

/** Exact document scope for authoring. Root paths are validated against configured block schemas. */
export interface EditorTarget {
  collection: string;
  id: string | number;
  root: string;
}
/** Serializable identity survives reordering; numeric data paths are resolved immediately before commands. */
export type { BlockIdentity } from "../../core/src/types.js";
/** Host permission is additional to native collection/document/field access. Never serialize this callback. */
export interface VisualEditorOptions {
  collections: Record<string, { roots: string[] }>;
  previewOrigin: string;
  /** Exact additional trusted browser origins serving this same editor (for example a deployment's branch alias).
   * Configure these on the server; wildcards and request-derived host trust are deliberately unsupported.
   */
  additionalPreviewOrigins?: string[];
  previewPath?: string;
  /** Legacy dedicated editing route. Same-page hosts explicitly opt into a signed website session through resolvePagePath. */
  editorPath?: string;
  /** Resolve the real website pathname to enable in-place activation. Draft authorization remains document/session scoped. */
  resolvePagePath?: (
    context: EditorCapabilityContext,
  ) => string | undefined | Promise<string | undefined>;
  disabled?: boolean;
  canEdit: (args: {
    req: PayloadRequest;
    target: EditorTarget;
    document: Record<string, unknown>;
  }) => boolean | Promise<boolean>;
  sessionTTL?: number;
  policies?: Record<
    string,
    Record<string, import("./state/policy.js").StructuralPolicy>
  >;
  concurrency?: ConcurrencyAdapter;
  /** Optional catalogue presentation. Examples are transient render-only data, never default persisted content. */
  catalogue?: Record<string, EditorCatalogueEntry>;
  /** Server-owned business commands may update explicit operational paths in the complete live snapshot.
   * Native access, transaction locks and expected revision remain mandatory. Paths cannot overlap visual roots.
   * This callback is never serialized and must authorize an existing reviewed domain command, never client data.
   */
  operationalWrites?: Record<string, OperationalWritePolicy>;
  /** Default tools can be omitted or capability-gated. This never grants native document/field permissions. */
  tools?: Partial<Record<EditorTool, boolean | EditorCapability>>;
  /** Consumer-owned tools resolve through Payload's import map and the same native Form. */
  extensions?: EditorExtension[];
  /** Native field panels need no custom React component. Native field ACL remains the write authority. */
  fieldPanels?: EditorFieldPanel[];
  /** Import-map components that register typed contextual field strategies inside the native Form. */
  strategyProviders?: { id: string; Component: PayloadComponent }[];
  /** Active-only import-map providers for observers and other client integrations. They receive no document data by default. */
  providers?: { id: string; Component: PayloadComponent }[];
  /** Presentation policy for selected native block fields; it never widens Payload access. */
  blockControls?: Record<string, EditorBlockControls>;
}
/** Authenticated activation is short lived and bound to the current Payload session and exact target. */
export interface EditContext {
  target: EditorTarget;
  user: string;
  session: string;
  expires: number;
  nonce: string;
  /** Server-resolved website path. Present only for same-page editing, never an authorization substitute. */
  pagePath?: string;
}

/** Lock the exact write transaction before Payload reads the latest draft. Unsupported adapters must throw. */
export interface ConcurrencyAdapter {
  name: string;
  lock: (req: PayloadRequest, key: string) => Promise<void>;
}

/** A bounded exception for operational state such as capacity, independent from draft editorial publication. */
export interface OperationalWritePolicy {
  paths: string[];
  authorize: (req: PayloadRequest) => boolean | Promise<boolean>;
}

/** Browser-visible activation never includes the signed cookie or underlying authentication session ID. */
export type Activation = Pick<
  EditContext,
  "target" | "nonce" | "expires" | "pagePath"
>;

/** Built-in tools are independently configurable; draft persistence still uses the single native Form. */
export type EditorTool = "content" | "sections" | "history" | "publish";
export type EditorLabel = string | { en: string; de: string };
/** Server-only capability inputs always come from the authenticated, freshly authorized target. */
export interface EditorCapabilityContext {
  req: PayloadRequest;
  target: EditorTarget;
  document: Record<string, any>;
}
export type EditorCapability = (
  context: EditorCapabilityContext,
) => boolean | Promise<boolean>;
interface ExtensionBase {
  /** Hide the default tools-menu entry when a custom control owns the trigger. This is presentation, not a capability check. */
  showInDock?: boolean;
  id: string;
  label: EditorLabel;
  canUse?: EditorCapability;
}
/** Panels mount inside the editor's native Form. Consumer components must use NativeFieldSlot for field ownership. */
export interface EditorPanelExtension extends ExtensionBase {
  kind: "panel";
  Component: PayloadComponent;
  width?: number;
}
/** Actions are explicit, origin-checked server operations. Delegate writes to existing domain APIs with current req and overrideAccess:false.
 * The plugin authorizes the document and capability again; a client-supplied subject is untrusted host input, never authority.
 */
export interface EditorActionExtension extends ExtensionBase {
  kind: "action";
  /** Domain actions normally operate on a saved revision. */
  requireSaved?: boolean;
  run: (
    context: EditorCapabilityContext & { input: unknown; subject?: string },
  ) => Promise<{ message: string; refresh?: boolean }>;
  confirmation?: {
    title: EditorLabel;
    description: EditorLabel;
    confirmLabel: EditorLabel;
    destructive?: boolean;
  };
}
/** Consumer controls render inside the contextual surface and can use native fields or invoke capability-checked actions. */
export interface EditorControlExtension extends ExtensionBase {
  kind: "control";
  Component: PayloadComponent;
  width?: number;
}
export type EditorExtension =
  | EditorPanelExtension
  | EditorControlExtension
  | EditorActionExtension;
/** Paths are native schema names relative to the document or the stable selected block, never DOM text selectors. */
export interface EditorFieldPanel extends ExtensionBase {
  scope?: "document" | "selection";
  fields: string[];
  blockTypes?: string[];
  width?: number;
}
export interface EditorBlockControls {
  /** Omitted means all native fields; unshown values stay in the native Form. Use native field access for authorization. */
  fields?: string[];
  /** Omitted enables direct native text/textarea editing; false keeps editing in the secondary native fields panel. */
  inlineEdit?: false | string[];
}

/** Authorized server-rendered presentation only; native Form data/persistence is never replaced by this read result. */
export interface EditorPreviewSnapshot {
  revision: number | string;
  content: import("react").ReactNode;
  preview?: import("react").ReactNode;
}
/** Every preview read reauthorizes the exact activated target. Denial must be returned without redirecting/unmounting the working Form. */
export type EditorPreviewResponse =
  | EditorPreviewSnapshot
  | { error: "denied" | "unavailable" };

/** Describes an allowed block in the active editor; it cannot widen native block/field access. */
export interface EditorCatalogueEntry {
  label?: EditorLabel;
  description?: EditorLabel;
  group?: EditorLabel;
  thumbnail?: { src: string; alt?: string };
  /** Presentation example only. Committing still uses native schema defaults and validation. */
  example?: Record<string, unknown>;
}
