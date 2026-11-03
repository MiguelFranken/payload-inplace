"use client";
import { createContext, use, type ReactNode } from "react";
const PortalContext = createContext<HTMLElement | null>(null);
/** Keeps Base UI portals inside the editor shadow root and its prefixed stylesheet. */
export function ChromePortalProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: ReactNode;
}) {
  return <PortalContext value={container}>{children}</PortalContext>;
}
/** Returns the isolated host; null is transient while the authoring chrome mounts. */
export function useChromePortal() {
  return use(PortalContext);
}
