import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { createLocalReq, getPayload } from "payload";
import config, { editorOptions } from "@payload-config";
import { importMap } from "../app/(payload)/admin/importMap.js";
import { readEditContext } from "payload-inplace/server";
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
  const req = await createLocalReq({ user }, payload);
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
