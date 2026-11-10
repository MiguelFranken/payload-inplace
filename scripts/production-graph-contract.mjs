import { createHash } from "node:crypto";

const publicAsset =
  /^\/_next\/static\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:js|css)$/;

function chunkURL(chunk) {
  return chunk.startsWith("/_next/") ? chunk : `/_next/${chunk}`;
}

/** Require three complete anonymous samples from this build and consistent fingerprints for repeated resources. */
export function observedPublicResources(observation, buildId, requiredChunks) {
  if (
    !buildId ||
    observation?.role !== "anonymous" ||
    observation.production !== true ||
    observation.buildId !== buildId ||
    !Array.isArray(observation.samples) ||
    observation.samples.length !== 3
  )
    throw Error(
      "Fresh production anonymous observations from this build required",
    );

  if (!Array.isArray(requiredChunks) || !requiredChunks.length)
    throw Error("Production build is missing runtime chunks");

  const required = requiredChunks.map(chunkURL);
  const delivered = new Map();
  for (const sample of observation.samples) {
    if (!Array.isArray(sample?.resources) || !sample.resources.length)
      throw Error("Incomplete public resource sample");

    const urls = new Set();
    for (const resource of sample.resources) {
      if (
        typeof resource?.url !== "string" ||
        !publicAsset.test(resource.url) ||
        !Number.isSafeInteger(resource.bytes) ||
        resource.bytes <= 0 ||
        typeof resource.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(resource.sha256)
      )
        throw Error("Invalid public resource fingerprint");

      const previous = delivered.get(resource.url);
      if (
        previous &&
        (previous.bytes !== resource.bytes ||
          previous.sha256 !== resource.sha256)
      )
        throw Error(`Inconsistent public resource: ${resource.url}`);
      urls.add(resource.url);
      delivered.set(resource.url, resource);
    }
    for (const url of required)
      if (!urls.has(url)) throw Error(`Public resource sample missing ${url}`);
  }
  return delivered;
}

/** Match the browser response body against the artifact before using its chunk path as evidence. */
export function assertObservedResourceContent(resource, content) {
  if (
    content.byteLength !== resource.bytes ||
    createHash("sha256").update(content).digest("hex") !== resource.sha256
  )
    throw Error(
      `Public resource differs from production build: ${resource.url}`,
    );
}

/** Normalize both Next manifest chunk formats and require a positive match. */
export function selectDeliveredModules(modules, delivered) {
  const selected = Object.fromEntries(
    Object.entries(modules).filter(([, module]) =>
      module.chunks.some((chunk) => delivered.has(chunkURL(chunk))),
    ),
  );
  if (!Object.keys(selected).length)
    throw Error("Empty delivered graph cannot prove isolation");
  return selected;
}

const plugin =
  /(?:\[project\]\/dist\/|\[project\]\/packages\/payload-inplace\/dist\/|(?:^|\/)node_modules\/payload-inplace\/dist\/)/;

/** Demo visitor resources permit only the inert registration, regardless of facade workspace/install layout. Native dependencies are never public. */
export function assertPublicGraph(modules) {
  for (const source of Object.keys(modules)) {
    const registration = source.endsWith(
      "/dist/payload-inplace/src/launcher/DeferredLauncher.js",
    );
    if (
      !registration &&
      (plugin.test(source) ||
        /@payloadcms[+/](?:ui|richtext)|(?:^|\/)lexical(?:\/|$)|visual-editor/.test(
          source,
        ))
    )
      throw Error(`Public client module leak: ${source}`);
  }
}

/** The registered active route must contain the real native shell; an empty public graph is not sufficient proof. */
export function assertActiveGraph(modules) {
  for (const source of Object.keys(modules))
    if (
      plugin.test(source) &&
      /\/(?:exports\/testing\.js|testing\/)/.test(source)
    )
      throw Error(`Testing helper leaked into active application: ${source}`);
  if (
    !Object.keys(modules).some(
      (source) =>
        plugin.test(source) &&
        /\/(?:payload-inplace\/src\/)?frontend\/DeferredEditor\.js$/.test(
          source,
        ),
    )
  )
    throw Error("Active editor graph missing native shell");
}
