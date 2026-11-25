import type { MediaLibraryAdapter } from "payload-inplace/frontend";
import type { Media } from "../payload-types";

type Upload = NonNullable<MediaLibraryAdapter["upload"]>;

/** Upload the asset with the current browser session. The editor saves the resulting reference separately. */
export const uploadDemoMedia: Upload = ({
  file,
  collections,
  signal,
  onProgress,
}) =>
  new Promise((resolve, reject) => {
    const abortError = () => new DOMException("Upload cancelled", "AbortError");
    if (signal.aborted) return reject(abortError());
    if (!collections.includes("media"))
      return reject(
        new Error("This example only supports the media collection"),
      );

    const body = new FormData();
    body.set("file", file);
    body.set("_payload", "{}");

    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    request.open("POST", "/api/demo-media-upload");
    request.responseType = "json";
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("abort", () => reject(abortError()), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(new Error("Media upload unavailable")),
      { once: true },
    );
    request.addEventListener(
      "loadend",
      () => signal.removeEventListener("abort", abort),
      { once: true },
    );
    request.addEventListener(
      "load",
      () => {
        const doc:
          | (Pick<Media, "filename"> & { id: number | string })
          | undefined = request.response?.doc;
        if (
          request.status < 200 ||
          request.status >= 300 ||
          (typeof doc?.id !== "number" && typeof doc?.id !== "string")
        ) {
          reject(
            new Error("Payload denied the upload or returned an invalid asset"),
          );
          return;
        }
        resolve({
          collection: "media",
          id: doc.id,
          label: doc.filename || file.name,
        });
      },
      { once: true },
    );
    signal.addEventListener("abort", abort, { once: true });
    request.send(body);
  });
