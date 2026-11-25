"use client";

import { Button } from "@payloadcms/ui";
import {
  EditorFieldStrategy,
  defineFieldStrategy,
  defineMediaFieldStrategy,
  createPayloadMediaLibrary,
} from "payload-inplace/frontend";

import { uploadDemoMedia } from "../commerce/upload-demo-media";

const background = defineFieldStrategy({
  id: "commerce-background",
  types: ["select"],
  match: ({ path }) => path.endsWith(".background"),
  Component: ({ field, value, setValue, disabled, openNative }) => (
    <div role="group" aria-label="Background presets">
      <p>Choose a surface for this section.</p>
      {field.options.map((option) => {
        const key = typeof option === "string" ? option : option.value,
          label =
            typeof option === "string"
              ? option
              : typeof option.label === "string"
                ? option.label
                : key;
        return (
          <Button
            key={key}
            type="button"
            buttonStyle={value === key ? "primary" : "secondary"}
            extraButtonProps={{ "aria-pressed": value === key }}
            disabled={disabled}
            onClick={() => setValue(key)}
          >
            {label}
          </Button>
        );
      })}
      <Button type="button" buttonStyle="secondary" onClick={openNative}>
        Open native field
      </Button>
    </div>
  ),
});

const nativeMedia = createPayloadMediaLibrary({ collection: "media" });
const media = defineMediaFieldStrategy(nativeMedia);
const mediaWithTestUpload = defineMediaFieldStrategy({
  ...nativeMedia,
  async upload({ file, signal }) {
    signal.throwIfAborted();
    const body = new FormData();
    body.set("file", file);
    // The browser fixture can settle this upload after the picker cancels it.
    const response = await fetch("/api/media", { method: "POST", body });
    if (!response.ok) throw Error("Demo upload failed");
    const { doc } = await response.json();
    return { id: doc.id, collection: "media", label: doc.filename };
  },
});
const mediaWithUpload = defineMediaFieldStrategy({
  ...nativeMedia,
  id: "demo-media-upload",
  upload: uploadDemoMedia,
});

/** Registration is active-only and document-local. Options and persistence remain native. */
export function CommerceStrategies({
  enableExampleUpload = false,
  enableTestUpload = false,
}: {
  enableExampleUpload?: boolean;
  enableTestUpload?: boolean;
}) {
  let mediaStrategy = media;
  if (enableExampleUpload) mediaStrategy = mediaWithUpload;
  else if (enableTestUpload) mediaStrategy = mediaWithTestUpload;

  return (
    <>
      <EditorFieldStrategy definition={background} />
      <EditorFieldStrategy definition={mediaStrategy} />
    </>
  );
}
