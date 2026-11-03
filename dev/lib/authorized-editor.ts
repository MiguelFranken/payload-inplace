import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { initI18n } from "@payloadcms/translations";
import { createLocalReq, getPayload, getRequestLanguage } from "payload";
import config, { editorOptions } from "@payload-config";
import { importMap } from "../app/(payload)/admin/importMap.js";
import { readEditContext } from "../../dist/exports/server.js";
/** Every frontend render and native server-function call checks the current session and activation again. */
export async function authorizedEditor(
  identifier: string | undefined,
  action = false,
) {
  function deny(): never {
    if (action)
      throw Object.assign(new Error("Editing access denied"), { status: 403 });
    notFound();
  }
  if (!identifier || !/^[a-zA-Z0-9_-]{32}$/.test(identifier)) deny();
  const requestHeaders = await headers(),
    payload = await getPayload({ config });
  payload.importMap = importMap;
  const { user } = await payload.auth({ headers: requestHeaders });
  if (!user) deny();
  const language = getRequestLanguage({
    config: payload.config,
    cookies: await cookies(),
    headers: requestHeaders,
  });
  const i18n = await initI18n({
    config: payload.config.i18n,
    language,
    context: "api",
  });
  const req = await createLocalReq(
    { user, req: { i18n, headers: new Headers(requestHeaders) } },
    payload,
  );
  req.headers = new Headers(requestHeaders);
  const token = (await cookies()).get(`payload-ve-${identifier}`)?.value || "";
  let result;
  try {
    result = await readEditContext(req, token, editorOptions);
  } catch {
    deny();
  }
  if (result.context.nonce !== identifier) deny();
  return { ...result, req, token };
}
