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
const mediaWithUpload = defineMediaFieldStrategy({
  ...nativeMedia,
  id: "demo-media-upload",
  upload: uploadDemoMedia,
});

/** Registration is active-only and document-local. Options and persistence remain native. */
export function CommerceStrategies({
  enableExampleUpload = false,
}: {
  enableExampleUpload?: boolean;
}) {
  return (
    <>
      <EditorFieldStrategy definition={background} />
      <EditorFieldStrategy
        definition={enableExampleUpload ? mediaWithUpload : media}
      />
    </>
  );
}
