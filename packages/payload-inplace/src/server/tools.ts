import { localizedLabel } from "../i18n/labels.js";
import type {
  EditorCapabilityContext,
  EditorLabel,
  EditorTool,
  VisualEditorOptions,
} from "../types.js";

export const defaultTools: EditorTool[] = [
  "content",
  "sections",
  "history",
  "publish",
];

/** Compute capability-filtered descriptors only. Server callbacks and component paths never become client authority. */
export async function resolveTools(
  options: VisualEditorOptions,
  context: EditorCapabilityContext,
) {
  const tools: EditorTool[] = [];
  for (const tool of defaultTools) {
    const rule = options.tools?.[tool];
    if (rule !== false && (typeof rule !== "function" || (await rule(context))))
      tools.push(tool);
  }
  const extensions = [];
  for (const extension of options.extensions || [])
    if (!extension.canUse || (await extension.canUse(context)))
      extensions.push(extension);
  const fieldPanels = [];
  for (const panel of options.fieldPanels || [])
    if (!panel.canUse || (await panel.canUse(context))) fieldPanels.push(panel);
  return { tools, extensions, fieldPanels };
}

/** Resolve the supported editor UI locales without serializing host label functions. */
export function editorLabel(label: EditorLabel, language: string) {
  return localizedLabel(
    label,
    language,
    typeof label === "string" ? label : label.en,
  );
}
