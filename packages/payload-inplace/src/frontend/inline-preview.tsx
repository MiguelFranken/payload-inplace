"use client";

import { createContext, use, useEffect } from "react";
import {
  useDocumentInfo,
  useFormModified,
  useFormProcessing,
  useFormBackgroundProcessing,
} from "@payloadcms/ui";

/** Preview rendering may pause around a focused native inline field, while persistence continues normally. */
export interface InlinePreviewGuard {
  active: boolean;
  begin: () => void;
  end: () => void;
  synchronized: (revision: string | number) => void;
}

export const InlinePreviewContext = createContext<InlinePreviewGuard>(null!);

export function useInlinePreviewGuard() {
  return use(InlinePreviewContext);
}

/** Release a focused-field render hold only after the native form acknowledges its current changes. */
export function NativePreviewSync() {
  const guard = useInlinePreviewGuard(),
    info = useDocumentInfo(),
    modified = useFormModified(),
    processing = useFormProcessing(),
    background = useFormBackgroundProcessing();
  useEffect(() => {
    if (!guard.active && !modified && !processing && !background)
      guard.synchronized(info.data?._veRevision ?? info.data?.updatedAt);
  }, [
    guard.active,
    modified,
    processing,
    background,
    info.data?._veRevision,
    info.data?.updatedAt,
  ]);
  return null;
}
