"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useEditorMessages } from "./messages";
import { useConfig, useForm } from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import type { Activation, BlockIdentity, EditorTool } from "../types";

/** Serializable, capability-filtered tools. Panel content is resolved through Payload's import map on the server. */
export interface ResolvedEditorExtension {
  showInDock?: boolean;
  requireSaved?: boolean;
  id: string;
  kind: "panel" | "control" | "action";
  label: string;
  content?: ReactNode;
  width?: number;
  confirmation?: {
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
  };
}

interface VisualEditorContext {
  target: Activation["target"];
  tools: EditorTool[];
  extensions: ResolvedEditorExtension[];
  selection?: BlockIdentity;
  setSelection: (selection: BlockIdentity | undefined) => void;
  openPanels: string[];
  openPanel: (id: string) => void;
  closePanel: (id: string) => void;
  runAction: (
    id: string,
    input?: unknown,
    subject?: string,
  ) => Promise<{ message: string; refresh?: boolean }>;
}

const Context = createContext<VisualEditorContext>(null!);

/** Consumer controls share the current authorized target and native form; server actions recheck their own capability. */
export function useVisualEditor() {
  const value = use(Context);
  if (!value)
    throw new Error("useVisualEditor requires activated website editing");
  return value;
}

/** Stores disclosure/selection state only, never another document model or save queue. */
export function EditorToolsProvider({
  context,
  tools,
  extensions,
  children,
}: {
  context: Activation;
  tools: EditorTool[];
  extensions: ResolvedEditorExtension[];
  children: ReactNode;
}) {
  const { t } = useEditorMessages();
  const [openPanels, setOpenPanels] = useState<string[]>([]),
    [selection, setSelection] = useState<BlockIdentity>();
  const form = useForm(),
    { config } = useConfig(),
    router = useRouter();
  const openPanel = useCallback(
    (id: string) => {
      if (!extensions.some((e) => e.id === id && e.kind === "panel")) return;
      setOpenPanels([id]);
    },
    [extensions],
  );
  const closePanel = useCallback(
    (id: string) =>
      setOpenPanels((open) => open.filter((current) => current !== id)),
    [],
  );
  const runAction = useCallback(
    async (id: string, input?: unknown, subject?: string) => {
      if (!extensions.some((e) => e.id === id && e.kind === "action"))
        throw new Error(t("actionUnavailable"));
      const response = await fetch(
        `${config.routes.api}/visual-editor/action${context.locale ? `?locale=${encodeURIComponent(context.locale)}` : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: id,
            proof: form.getData()._veActivation,
            expectedRevision:
              form.getData()._veRevision ?? form.getData().updatedAt,
            input,
            subject,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t("actionFailed"));
      if (result.refresh) router.refresh();
      return result;
    },
    [extensions, form, config.routes.api, context.locale, t],
  );
  const value = useMemo(
    () => ({
      target: context.target,
      tools,
      extensions,
      selection,
      setSelection,
      openPanels,
      openPanel,
      closePanel,
      runAction,
    }),
    [
      context.target,
      tools,
      extensions,
      selection,
      openPanels,
      openPanel,
      closePanel,
      runAction,
    ],
  );
  return <Context value={value}>{children}</Context>;
}
