import type { ServerFunctionHandler } from "payload";
import { handleServerFunctions as nativeHandler } from "@payload-visual-editor/native-handler";

/** Payload's unchanged native handler, resolved without its admin RootLayout/CSS barrel.
 * @see withVisualEditorNext installs the required version-locked server-only alias.
 */
export const handleServerFunctions: ServerFunctionHandler = nativeHandler;
