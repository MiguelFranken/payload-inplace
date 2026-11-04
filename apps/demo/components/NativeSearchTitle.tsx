"use client";
import { TextField } from "@payloadcms/ui";
import type { TextFieldClientProps } from "payload";
/** Exercises a consumer custom native field inside an unrestricted named tab, including after background saves. */
export function NativeSearchTitle(props: TextFieldClientProps) {
  return <TextField {...props} />;
}
