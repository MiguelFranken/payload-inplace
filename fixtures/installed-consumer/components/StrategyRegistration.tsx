"use client";

import {
  EditorFieldStrategy,
  createPayloadMediaLibrary,
  defineMediaFieldStrategy,
  defineFieldStrategy,
} from "payload-inplace/frontend";
import { priceControls } from "./PriceControls";

const media = defineMediaFieldStrategy({
  ...createPayloadMediaLibrary({ collection: "assets" }),
  id: "installed-media",
  async upload({ file, signal, onProgress }) {
    const body = new FormData();
    body.set("file", file);
    onProgress(0);
    const response = await fetch("/api/assets", {
      method: "POST",
      body,
      signal,
      credentials: "same-origin",
    });
    if (!response.ok) throw Error("Native upload rejected");
    const { doc } = await response.json();
    onProgress(100);
    return {
      id: doc.id,
      collection: "assets",
      label: doc.filename,
      mimeType: doc.mimeType,
      thumbnailURL: doc.url,
    };
  },
});

const date = defineFieldStrategy({
  id: "installed-date",
  types: ["date"],
  Component: ({ value, setValue, disabled, openNative }) => (
    <div>
      <label>
        Schedule
        <input
          type="datetime-local"
          disabled={disabled}
          value={value?.slice(0, 16) || ""}
          onChange={(event) =>
            setValue(
              event.target.value
                ? new Date(event.target.value + ":00Z").toISOString()
                : null,
            )
          }
        />
      </label>
      <button onClick={openNative}>Native schedule options</button>
    </div>
  ),
});

export function StrategyRegistration() {
  return (
    <>
      <EditorFieldStrategy definition={priceControls} />
      <EditorFieldStrategy definition={media} />
      <EditorFieldStrategy definition={date} />
    </>
  );
}
