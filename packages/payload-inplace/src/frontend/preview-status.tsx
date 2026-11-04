"use client";
import { createContext, use } from "react";
/** Preview reads are separate from persistence. A saved draft may have a pending or unavailable server-rendered preview. */
export const PreviewStatusContext = createContext<{
  pending: boolean;
  error: string;
  retry: () => void;
}>({ pending: false, error: "", retry: () => {} });
export function usePreviewStatus() {
  return use(PreviewStatusContext);
}
