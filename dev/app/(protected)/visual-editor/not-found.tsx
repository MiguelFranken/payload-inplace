/** Untrusted or expired activation links never render draft content or load the editor. */
export default function EditorUnavailable() {
  return (
    <main className="demo:box-border demo:flex demo:min-h-dvh demo:items-center demo:justify-center demo:p-6">
      <section className="demo:w-full demo:max-w-sm">
        <h1 className="demo:m-0 demo:text-2xl demo:font-semibold demo:tracking-tight">
          Open the editor again
        </h1>
        <p className="demo:my-4 demo:text-base demo:leading-relaxed demo:text-neutral-600">
          This editing link is no longer available. Return to the page and
          choose Edit page to start a new session. Sign in first if you have
          signed out.
        </p>
        <div className="demo:flex demo:flex-wrap demo:items-center demo:gap-3">
          <a
            href="/pages/demo"
            className="demo:inline-flex demo:min-h-11 demo:items-center demo:rounded-lg demo:bg-blue-700 demo:px-4 demo:text-sm demo:font-medium demo:text-white demo:no-underline demo:focus-visible:outline-2 demo:focus-visible:outline-offset-4 demo:focus-visible:outline-blue-700"
          >
            Open demo page
          </a>
          <a
            href="/visual-editor/start?collection=pages&slug=demo"
            className="demo:inline-flex demo:min-h-11 demo:items-center demo:px-2 demo:text-sm demo:text-inherit demo:underline demo:underline-offset-4 demo:focus-visible:outline-2 demo:focus-visible:outline-offset-4"
          >
            Sign in to edit
          </a>
        </div>
      </section>
    </main>
  );
}
