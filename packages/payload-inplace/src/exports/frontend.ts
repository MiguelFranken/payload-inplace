"use client";
export { useVisualEditor } from "../frontend/tools-context";
export { NativeFieldSlot } from "../frontend/field-ownership";
export { useEditorPreviewData } from "../frontend/preview-data";

export {
  EditorFieldStrategy,
  defineFieldStrategy,
} from "../frontend/field-strategies";
export type {
  FieldStrategyDefinition,
  ContextualFieldProps,
  ContextualFieldKind,
  ContextualFieldValue,
} from "../frontend/field-strategies";
export {
  defineMediaFieldStrategy,
  createPayloadMediaLibrary,
} from "../frontend/media-library";
export type {
  MediaAsset,
  MediaPage,
  MediaLibraryAdapter,
} from "../frontend/media-library";
export { useEditorObserver } from "../frontend/lifecycle";
export type {
  EditorLifecycleEvent,
  EditorObserver,
  EditorOperation,
  EditorOutcome,
  EditorFailureCategory,
} from "@payload-inplace/core/events";

export { useEditorMessages } from "../frontend/messages";
