"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

const PageTransition = createContext<{
  refresh: () => void;
  pending: boolean;
} | null>(null);

/** Keep the website router/layout alive while the server reauthorizes and swaps published/draft content.
 * Mount at the same position in both modes, outside FrontendEditor. No document navigation or query token is needed.
 */
export function EditorPageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const viewport = useRef<{
    x: number;
    y: number;
    anchor?: string;
    top?: number;
  } | null>(null);
  function refresh() {
    const candidates = [
      ...document.querySelectorAll<HTMLElement>(
        "main [data-cms-block-id],main [id],article [data-cms-block-id],article [id]",
      ),
    ];
    const anchor = candidates.find((node) => {
      const rect = node.getBoundingClientRect();
      return (
        rect.bottom > 0 &&
        rect.top < innerHeight &&
        !node.closest("[data-ve-ui],[data-ve-launcher]")
      );
    });
    viewport.current = {
      x: scrollX,
      y: scrollY,
      anchor: anchor?.id
        ? `#${CSS.escape(anchor.id)}`
        : anchor?.dataset.cmsBlockId
          ? `[data-cms-block-id="${CSS.escape(anchor.dataset.cmsBlockId)}"]`
          : undefined,
      top: anchor?.getBoundingClientRect().top,
    };
    startTransition(() => router.refresh());
  }
  useLayoutEffect(() => {
    if (pending || !viewport.current) return;
    const position = viewport.current;
    viewport.current = null;
    // The live preview portal mounts immediately after the RSC commit. Restore once it has its real geometry.
    const frame = requestAnimationFrame(() => {
      const anchor = position.anchor
        ? document.querySelector(position.anchor)
        : null;
      const delta =
        anchor && position.top !== undefined
          ? anchor.getBoundingClientRect().top - position.top
          : 0;
      if (document.activeElement === document.body) {
        const host = document.querySelector("[data-ve-ui]");
        const control =
          host?.shadowRoot?.querySelector<HTMLElement>("nav button") ||
          document.querySelector<HTMLElement>("[data-ve-launcher] button");
        control?.focus({ preventScroll: true });
      }
      window.scrollTo({
        left: position.x,
        top: anchor ? scrollY + delta : position.y,
        behavior: "instant",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [pending, children]);
  return (
    <PageTransition value={{ refresh, pending }}>{children}</PageTransition>
  );
}

/** Optional because legacy dedicated editor routes remain supported. */
export function useEditorPageTransition() {
  return useContext(PageTransition)?.refresh || null;
}

/** Loading state for the lightweight activation control; independent of the native editor save queue. */
export function useEditorPagePending() {
  return useContext(PageTransition)?.pending || false;
}
