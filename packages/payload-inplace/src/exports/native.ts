import type { ServerFunctionHandler } from "payload";
import { handleServerFunctions as nativeHandler } from "@payload-visual-editor/native-handler";
import { synchronizeNativeSchemaCaches } from "../server/frontend-config.js";

/** Delegate unchanged native server functions after synchronizing the current v3 schema caches.
 * This also covers native subform requests after schema hot reload, without mutating access checks or data.
 * @see withVisualEditorNext installs the required version-locked server-only alias.
 */
export const handleServerFunctions: ServerFunctionHandler = async (args) => {
  synchronizeNativeSchemaCaches(await args.config);
  return nativeHandler(args);
};
