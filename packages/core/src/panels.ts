/** Disclosure state only; native fields and documents never enter this reducer. */
export type PanelState =
  | { kind: "closed" }
  | { kind: "sections" | "settings" | "versions" | "conflict" | "move-section" }
  | { kind: "extension"; id: string }
  | { kind: "validation"; path: string };

export type PanelAction =
  | { type: "open"; panel: Exclude<PanelState, { kind: "closed" }> }
  | { type: "close"; kind?: PanelState["kind"] };

/** Closing a stale panel never closes its replacement; the same view can always reopen. */
export function panelTransition(
  state: PanelState,
  action: PanelAction,
): PanelState {
  if (action.type === "open") return action.panel;
  if (action.kind && state.kind !== action.kind) return state;
  return state.kind === "closed" ? state : { kind: "closed" };
}
