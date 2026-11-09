"use client";

import { useCallback, useState, type SetStateAction } from "react";
import {
  panelTransition,
  type PanelState,
} from "@payload-inplace/core/panels";

const value = <T>(next: SetStateAction<T>, previous: T): T =>
  typeof next === "function" ? (next as (v: T) => T)(previous) : next;

/** One mutually exclusive disclosure state prevents overlapping/stuck floatables. */
export function usePanelNavigation() {
  const [panel, setPanel] = useState<PanelState>({ kind: "closed" });
  const open = useCallback(
    (panel: Exclude<PanelState, { kind: "closed" }>) =>
      setPanel((current) => panelTransition(current, { type: "open", panel })),
    [],
  );
  const close = useCallback(
    (kind?: PanelState["kind"]) =>
      setPanel((current) =>
        panelTransition(current, { type: "close", ...(kind ? { kind } : {}) }),
      ),
    [],
  );
  const setOutline = useCallback(
    (next: SetStateAction<boolean>) =>
      setPanel((current) =>
        value(next, current.kind === "sections")
          ? { kind: "sections" }
          : panelTransition(current, { type: "close", kind: "sections" }),
      ),
    [],
  );
  const setSettingsOpen = useCallback(
    (next: SetStateAction<boolean>) =>
      setPanel((current) =>
        value(next, current.kind === "settings")
          ? { kind: "settings" }
          : panelTransition(current, { type: "close", kind: "settings" }),
      ),
    [],
  );
  const setCustomTool = useCallback(
    (next: SetStateAction<string | null>) =>
      setPanel((current) => {
        const id = value(
          next,
          current.kind === "extension" ? current.id : null,
        );
        return id
          ? { kind: "extension", id }
          : panelTransition(current, { type: "close", kind: "extension" });
      }),
    [],
  );
  const setValidationPath = useCallback(
    (next: SetStateAction<string | null>) =>
      setPanel((current) => {
        const path = value(
          next,
          current.kind === "validation" ? current.path : null,
        );
        return path
          ? { kind: "validation", path }
          : panelTransition(current, { type: "close", kind: "validation" });
      }),
    [],
  );
  return {
    panel,
    open,
    close,
    outline: panel.kind === "sections",
    settingsOpen: panel.kind === "settings",
    customTool: panel.kind === "extension" ? panel.id : null,
    validationPath: panel.kind === "validation" ? panel.path : null,
    setOutline,
    setSettingsOpen,
    setCustomTool,
    setValidationPath,
  };
}
