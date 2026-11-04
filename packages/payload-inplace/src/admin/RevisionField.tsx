"use client";
import { useField } from "@payloadcms/ui";
/** The native Form transports revision alongside content and accepts its server acknowledgement. */
export function RevisionField({ path }: { path: string }) {
  useField<number>({ path });
  return null;
}
