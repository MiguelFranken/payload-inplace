"use client";
import { createContext, use, useEffect, useRef, type ReactNode } from "react";
import { useConfig, useForm } from "@payloadcms/ui";
import type { BlockIdentity, SectionPatternSummary } from "../types.js";
export interface PatternCapabilities {
  canRead: boolean;
  canSave: boolean;
  allowedBlocks: string[];
}
interface PatternCommands extends PatternCapabilities {
  list: (
    page: number,
    signal: AbortSignal,
  ) => Promise<{ docs: SectionPatternSummary[]; hasNextPage: boolean }>;
  read: (
    id: string,
    signal: AbortSignal,
  ) => Promise<{ blockType: string; content: Record<string, unknown> }>;
  save: (
    identity: BlockIdentity,
    label: string,
    signal: AbortSignal,
  ) => Promise<SectionPatternSummary>;
}
const Context = createContext<PatternCommands | null>(null);
/** Optional transport only; no document data, persistence queue or library cache is mirrored here. */
export function SectionPatterns({
  capabilities,
  children,
}: {
  capabilities?: PatternCapabilities;
  children: ReactNode;
}) {
  const form = useForm(),
    { config } = useConfig(),
    disposed = useRef(false);
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
    };
  }, []);
  async function request<T>(
    input: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<T> {
    const response = await fetch(
      `${config.routes.api}/visual-editor/patterns`,
      {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          proof: form.getData()._veActivation,
          expectedRevision: form.getData()._veRevision,
        }),
      },
    );
    if (!response.ok || signal.aborted || disposed.current)
      throw Error("Pattern request unavailable");
    return response.json() as Promise<T>;
  }
  return (
    <Context
      value={
        capabilities
          ? {
              ...capabilities,
              list: (page, signal) =>
                request({ operation: "list", page }, signal),
              read: (id, signal) => request({ operation: "read", id }, signal),
              save: (identity, label, signal) =>
                request({ operation: "save", identity, label }, signal),
            }
          : null
      }
    >
      {children}
    </Context>
  );
}
/** Null when disabled: callers must omit controls and must not fetch a library by default. */
export function useSectionPatterns() {
  return use(Context);
}
