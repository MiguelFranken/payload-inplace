"use client";

import { useDocumentInfo } from "@payloadcms/ui";
import { NativeFieldSlot } from "payload-inplace/frontend";

/** Consumer-defined metadata control renders inside the shared contextual surface. */
export function DemoPageTools() {
  return <DemoPageDetails />;
}

/** Consumer-defined panel shares native metadata fields and can present app-specific read models. */
export function DemoPageDetails() {
  const info = useDocumentInfo();
  return (
    <div className="pve:grid pve:gap-4">
      <p className="pve:m-0 pve:text-sm pve:leading-relaxed">
        This panel belongs to the consuming app. Its page title uses the same
        native form as the selected content.
      </p>
      <NativeFieldSlot path="title" />
      <dl className="pve:m-0 pve:grid pve:gap-2 pve:text-sm">
        <div>
          <dt>Document</dt>
          <dd>{String(info.id)}</dd>
        </div>
        <div>
          <dt>Saved revision</dt>
          <dd>{String(info.data?._veRevision ?? "Single writer")}</dd>
        </div>
      </dl>
    </div>
  );
}
