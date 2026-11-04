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
