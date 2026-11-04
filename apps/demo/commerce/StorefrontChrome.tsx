import { ArrowUpRight } from "lucide-react";

/** Consumer navigation remains mounted in the shared public/editor layout, including during draft saves and soft activation. */
export function StorefrontHeader() {
  return (
    <>
      <a
        href="#main-content"
        className="demo:sr-only demo:focus:not-sr-only demo:focus:fixed demo:focus:top-3 demo:focus:z-50 demo:focus:rounded demo:focus:bg-white demo:focus:p-4 demo:focus:text-ink"
      >
        Skip to content
      </a>
      <header
        data-test-site-header=""
        className="demo:border-0 demo:border-b demo:border-solid demo:border-line demo:bg-canvas"
      >
        <div className="demo:mx-auto demo:flex demo:min-h-20 demo:max-w-7xl demo:items-center demo:justify-between demo:gap-4 demo:px-5 demo:sm:px-8 demo:lg:px-12">
          <a
            href="/shop"
            className="demo:font-display demo:text-2xl demo:tracking-tight demo:text-ink demo:no-underline demo:sm:text-3xl"
          >
            Still &amp; Form
          </a>
          <nav
            aria-label="Storefront navigation"
            className="demo:flex demo:items-center demo:gap-5 demo:sm:gap-8"
          >
            <a
              href="/shop#collection"
              className="demo:inline-flex demo:min-h-11 demo:items-center demo:text-sm demo:text-ink demo:no-underline demo:hover:underline demo:underline-offset-4"
            >
              Collection
            </a>
            <a
              href="/shop#studio-story"
              className="demo:hidden demo:min-h-11 demo:items-center demo:text-sm demo:text-ink demo:no-underline demo:hover:underline demo:underline-offset-4 demo:sm:inline-flex"
            >
              Our story
            </a>
            <span className="demo:hidden demo:rounded-full demo:border demo:border-solid demo:border-line demo:px-3 demo:py-2 demo:text-xs demo:text-muted demo:md:inline">
              The demo store
            </span>
          </nav>
        </div>
      </header>
    </>
  );
}

export function StorefrontFooter() {
  return (
    <footer id="site-footer" className="demo:bg-ink demo:text-white">
      <div className="demo:mx-auto demo:flex demo:max-w-7xl demo:flex-wrap demo:items-start demo:justify-between demo:gap-9 demo:px-5 demo:py-12 demo:sm:px-8 demo:lg:px-12">
        <div className="demo:space-y-3">
          <a
            href="/shop"
            className="demo:font-display demo:text-3xl demo:text-white demo:no-underline"
          >
            Still &amp; Form
          </a>
          <p className="demo:m-0 demo:max-w-xs demo:text-sm demo:leading-relaxed demo:text-white/75">
            A few considered things, for the way you live.
          </p>
        </div>
        <div className="demo:space-y-3 demo:text-sm">
          <p className="demo:m-0 demo:text-white/75">
            An editable ecommerce demo.
          </p>
          <a
            href="/visual-editor/start?collection=shops&slug=home"
            className="demo:inline-flex demo:min-h-11 demo:items-center demo:gap-2 demo:text-white demo:underline demo:underline-offset-4"
          >
            Try Payload Inplace <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
