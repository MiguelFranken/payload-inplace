import { createEditorMessages } from "../i18n/messages";
import type { DocumentViewServerProps } from "payload";
import { GuardedRestore } from "./NativeGuardedRestore";

/** Keep the native restore endpoint while explicitly reviewing the current and historical revision. */
export async function GuardedVersionView({
  initPageResult,
  routeSegments,
}: DocumentViewServerProps) {
  const { t } = createEditorMessages({}, initPageResult.req.i18n.language);

  const { collectionConfig, globalConfig, docID, req } = initPageResult;
  if (globalConfig) {
    const selected = routeSegments.at(-1);
    if (!selected) return <p>{t("versionUnavailable")}</p>;
    const versions = await req.payload.findGlobalVersions({
      slug: globalConfig.slug as never,
      where: { id: { equals: selected } },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: false,
      fallbackLocale: false,
    });
    const version = versions.docs[0];
    if (!version) return <p>{t("versionUnavailable")}</p>;
    const current = await req.payload.findGlobal({
      slug: globalConfig.slug as never,
      draft: true,
      depth: 0,
      req,
      overrideAccess: false,
      fallbackLocale: false,
    });
    return (
      <GuardedRestore
        editorPath={
          globalConfig.admin?.custom?.visualEditorPath as string | undefined
        }
        global={globalConfig.slug}
        root={(globalConfig.admin?.custom?.visualEditorRoots as string[])?.[0]}
        versionID={String(version.id)}
        revision={(current as any)._veRevision || 0}
        current={current}
        historical={version.version}
      />
    );
  }
  if (!collectionConfig || docID === undefined)
    return <p>{t("versionUnavailable")}</p>;
  const result = await req.payload.findVersions({
    collection: collectionConfig.slug as any,
    where: { id: { equals: routeSegments.at(-1) } },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: false,
  });
  const version = result.docs[0];
  const parent: any = version?.parent;
  if (
    !version ||
    String(typeof parent === "object" ? parent.id : parent) !== String(docID)
  )
    return <p>{t("versionUnavailable")}</p>;
  const current: any = await req.payload.findByID({
    collection: collectionConfig.slug as any,
    id: docID,
    draft: true,
    depth: 0,
    req,
    overrideAccess: false,
  });
  return (
    <GuardedRestore
      collection={collectionConfig.slug}
      id={docID}
      versionID={String(version.id)}
      revision={current._veRevision ?? 0}
      current={current}
      historical={version.version}
    />
  );
}
