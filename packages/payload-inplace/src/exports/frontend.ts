"use client";
export { useVisualEditor } from "../frontend/tools-context.js";
export { NativeFieldSlot } from "../frontend/field-ownership.js";
export { useEditorPreviewData } from "../frontend/preview-data.js";

export {
  EditorFieldStrategy,
  defineFieldStrategy,
} from "../frontend/field-strategies.js";
export type {
  FieldStrategyDefinition,
  ContextualFieldProps,
  ContextualFieldKind,
  ContextualFieldValue,
} from "../frontend/field-strategies.js";
export {
  defineMediaFieldStrategy,
  createPayloadMediaLibrary,
} from "../frontend/media-library.js";
export type {
  MediaAsset,
  MediaPage,
  MediaLibraryAdapter,
} from "../frontend/media-library.js";
