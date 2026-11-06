import type {
  PayloadRequest,
  ServerFunctionHandler,
  ServerFunction,
  DefaultServerFunctionArgs,
} from "payload";
import { getAccessResults } from "payload";
import { buildFormStateHandler } from "@payloadcms/ui/utilities/buildFormState";
import { buildTableStateHandler } from "@payloadcms/ui/utilities/buildTableState";
import { _internal_renderFieldHandler } from "@payloadcms/ui/rsc";
import { handleServerFunctions as nativeHandler } from "@payload-visual-editor/native-handler";
import { synchronizeNativeSchemaCaches } from "../server/frontend-config.js";
import { contentLocale } from "../server/content-locale.js";
import { scopeNativeFunction } from "../adapters/native-function-scope.js";

/** Standard native admin bridge. Extra client properties can never select an editor request or override its authorization scope. */
export const handleServerFunctions: ServerFunctionHandler = async (args) => {
  synchronizeNativeSchemaCaches(await args.config);
  return nativeHandler(args);
};

/** The host freshly reauthorizes its signed editing scope on every invocation and passes the SERVER request as a separate argument, outside client-spread arguments.
 * Scopes native form/field/table preparation and consumer overrides to that request's content locale, rather than the admin's last-used locale preference. Persistence and ACLs remain native.
 * @see withVisualEditorNext installs the required version-locked server-only alias.
 */
export const handleEditorServerFunctions = async (
  args: Parameters<ServerFunctionHandler>[0],
  editorRequest: PayloadRequest,
): ReturnType<ServerFunctionHandler> => {
  synchronizeNativeSchemaCaches(await args.config);
  const nativeArgs = args;
  const code = contentLocale(editorRequest);
  const localization = editorRequest.payload.config.localization;
  const locale = localization
    ? localization.locales.find((item) => item.code === code)
    : undefined;
  if (localization && !locale)
    throw Error("Native editor locale is unavailable");
  const permissions = await getAccessResults({ req: editorRequest });
  const handlers: Record<string, ServerFunction<any, any>> = {
    "form-state": buildFormStateHandler,
    "render-field": _internal_renderFieldHandler,
    "table-state": buildTableStateHandler,
    ...nativeArgs.serverFunctions,
  };
  const scope: Pick<
    DefaultServerFunctionArgs,
    "req" | "user" | "permissions" | "locale"
  > = { req: editorRequest, user: editorRequest.user, permissions, locale };
  return nativeHandler({
    ...nativeArgs,
    serverFunctions: Object.fromEntries(
      Object.entries(handlers).map(([key, fn]) => [
        key,
        scopeNativeFunction(fn, scope),
      ]),
    ),
  });
};
