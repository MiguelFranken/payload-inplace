/** Require an explicit, disposable Postgres database before starting the demo. */
export function assertDemoPostgresUrl(connectionString) {
  try {
    const url = new URL(connectionString);
    const name = decodeURIComponent(url.pathname.slice(1));
    if (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      url.hostname &&
      !url.hash &&
      /^visual_editor(?:_[a-z0-9_]+)?$/.test(name) &&
      name.length <= 63
    )
      return;
  } catch {
    // URL parsing errors may contain credentials.
  }
  throw new Error(
    "Provide an isolated Postgres database named visual_editor or visual_editor_<suffix>",
  );
}
