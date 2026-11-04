import type { DefaultServerFunctionArgs, ServerFunction } from "payload";
/** Apply the freshly authorized server scope after untrusted native arguments. It neither persists values nor changes the native function contract. */
export function scopeNativeFunction(
  fn: ServerFunction<any, any>,
  scope: Pick<
    DefaultServerFunctionArgs,
    "req" | "user" | "permissions" | "locale"
  >,
): ServerFunction<any, any> {
  return (args) => fn({ ...args, ...scope });
}
