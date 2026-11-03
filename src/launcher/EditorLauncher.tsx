import type { PayloadRequest } from "payload";
import type { EditorTarget, VisualEditorOptions } from "../types.js";
import { authorizeTarget } from "../server/context.js";
import { resolveTools } from "../server/tools.js";
import { launcherStyles } from "./styles.generated.js";
/** Mount only for an authenticated CMS editor. Hosts can skip all auth work when their auth cookie is absent.
 * One explicit POST activation require no launcher JavaScript, including on anonymous route chunks.
 * Public HTML and published data remain separate from authoring: this serializes only a target and capability-filtered labels, never draft values or activation proof.
 */
export async function EditorLauncher({
  req,
  target,
  options,
}: {
  req: PayloadRequest;
  target: EditorTarget;
  options: VisualEditorOptions;
}) {
  if (!req.user || options.disabled) return null;
  let document;
  try {
    document = await authorizeTarget(req, target, options);
  } catch {
    return null;
  }

  const available = await resolveTools(options, { req, target, document }),
    de = req.i18n.language === "de";
  if (
    !available.tools.length &&
    !available.fieldPanels.length &&
    !available.extensions.length
  )
    return null;
  const panel =
    available.fieldPanels.find((item) => item.showInDock !== false) ||
    available.extensions.find(
      (item) => item.kind === "panel" && item.showInDock !== false,
    );
  const tool = available.tools.includes("content")
    ? "content"
    : available.tools.includes("sections")
      ? "sections"
      : panel
        ? `panel:${panel.id}`
        : undefined;
  return (
    <aside
      data-ve-launcher=""
      aria-label={de ? "Seitenwerkzeuge" : "Page tools"}
    >
      <style>{launcherStyles}</style>
      <form
        method="post"
        action={`${req.payload.config.routes.api}/visual-editor/activate`}
        className="pvl:fixed pvl:end-5 pvl:bottom-4 pvl:z-[var(--pve-z-index,2147483000)] pvl:m-0 pvl:font-[family-name:var(--pve-font-family,system-ui)]"
      >
        <input type="hidden" name="collection" value={target.collection} />
        <input type="hidden" name="id" value={target.id} />
        <input type="hidden" name="root" value={target.root} />
        {tool && <input type="hidden" name="tool" value={tool} />}
        <button
          type="submit"
          className="pvl:flex pvl:min-h-11 pvl:cursor-pointer pvl:items-center pvl:gap-2 pvl:box-border pvl:max-w-[calc(100vw-32px)] pvl:rounded-xl pvl:border pvl:border-solid pvl:border-[var(--pve-border,#e3e4e8)] pvl:bg-[var(--pve-surface,#fff)] pvl:px-3 pvl:py-2 pvl:[font-family:inherit] pvl:text-sm pvl:font-medium pvl:text-[var(--pve-text,#202127)] pvl:shadow-[0_4px_24px_#0000001a] pvl:hover:bg-[var(--pve-hover,#f1f2f5)] pvl:focus-visible:outline-2 pvl:focus-visible:outline-offset-2 pvl:focus-visible:outline-[var(--pve-accent,#3451eb)]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" />
            <path d="m13 6 5 5" />
          </svg>
          {de ? "Seite bearbeiten" : "Edit page"}
        </button>
      </form>
    </aside>
  );
}
