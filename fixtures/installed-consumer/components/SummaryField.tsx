"use client";
import { TextareaField } from "@payloadcms/ui";
import type { ComponentProps } from "react";
/** Consumer override remains a native field, even with a matching contextual registry. */
export function SummaryField(props: ComponentProps<typeof TextareaField>) {
  return (
    <div>
      <p>Consumer native summary</p>
      <TextareaField {...props} />
    </div>
  );
}
