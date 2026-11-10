import { editorActivationPath } from "../adapters/native-request";
import { createEditorMessages } from "@payload-inplace/ui/localization/messages";
import type { PayloadRequest } from "payload";
import type { EditorTarget, VisualEditorOptions } from "../types";
import { authorizeTarget } from "../server/context";
import { resolveTools } from "../server/tools";
import { DeferredInPlaceLauncher as InPlaceLauncher } from "./DeferredLauncher";
import { launcherStyles } from "./styles.generated";

/** Mount only for an authenticated CMS editor. Hosts can skip all auth work when their auth cookie is absent.
 * In-place hosts use a small activation adapter; anonymous routes never mount it.
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
  const { t } = createEditorMessages(options.ui, req.i18n.language);

  if (!req.user || options.disabled) return null;
  let document;
  try {
    document = await authorizeTarget(req, target, options);
  } catch {
    return null;
  }

  const available = await resolveTools(options, { req, target, document });
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
  const fields = (
    <>
      {target.kind === "global" ? (
        <>
          <input type="hidden" name="kind" value="global" />
          <input type="hidden" name="global" value={target.global} />
        </>
      ) : (
        <>
          <input type="hidden" name="collection" value={target.collection} />
          <input type="hidden" name="id" value={target.id} />
        </>
      )}
      <input type="hidden" name="root" value={target.root} />
      {tool && <input type="hidden" name="tool" value={tool} />}
      <button
        type="submit"
        aria-label={t("editPage")}
        title={t("editPage")}
        className="pvl:flex! pvl:size-11! pvl:cursor-pointer pvl:items-center! pvl:justify-center! pvl:box-border pvl:rounded-xl! pvl:border-0! pvl:bg-[var(--pve-accent,#3451eb)]! pvl:p-0! pvl:text-[var(--pve-accent-contrast,#fff)]! pvl:shadow-[0_4px_24px_#00000026] pvl:hover:brightness-90 pvl:focus-visible:outline-2 pvl:focus-visible:outline-offset-2 pvl:focus-visible:outline-[var(--pve-accent,#3451eb)] pvl:motion-safe:active:scale-[0.96] pvl:motion-safe:transition-[scale,filter] pvl:motion-safe:duration-100 pvl:disabled:cursor-wait pvl:disabled:opacity-60"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" />
          <path d="m13 6 5 5" />
        </svg>
      </button>
    </>
  );
  const action = editorActivationPath(
    req.payload.config.routes.api,
    req.locale,
  );
  const className =
    "pvl:fixed pvl:end-5 pvl:bottom-4 pvl:z-[var(--pve-z-index,2147483000)] pvl:m-0 pvl:font-[family-name:var(--pve-font-family,system-ui)]";
  return (
    <aside data-ve-launcher="" aria-label={t("pageTools")}>
      <style>{launcherStyles}</style>
      {options.resolvePagePath ? (
        <InPlaceLauncher
          action={action}
          errorMessage={t("couldNotOpenTheEditorPleaseTryAgain")}
          editorPath={options.editorPath || "/visual-editor"}
        >
          {fields}
        </InPlaceLauncher>
      ) : (
        <form method="post" action={action} className={className}>
          {fields}
        </form>
      )}
    </aside>
  );
}
