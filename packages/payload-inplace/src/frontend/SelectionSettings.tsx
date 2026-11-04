"use client";
import { useEffect, useRef } from "react";
import { Button } from "./ui/button.js";
import { Settings2 } from "lucide-react";
import { chrome } from "../admin/chrome.js";
/** Secondary options stay beside the selected content without covering its text or mounting another field owner. */
export function SelectionSettings({
  element,
  label,
  onOpen,
}: {
  element: Element;
  label: string;
  onOpen: () => void;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      frame = 0;
      if (!element.isConnected) return;
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = range.getClientRects();
      const rect = rects[rects.length - 1] || element.getBoundingClientRect();
      const x = Math.max(8, Math.min(rect.right + 8, innerWidth - 52)),
        y = Math.max(
          8,
          Math.min(rect.top + (rect.height - 40) / 2, innerHeight - 52),
        );
      anchor.current?.style.setProperty("--pve-settings-x", `${x}px`);
      anchor.current?.style.setProperty("--pve-settings-y", `${y}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    element.addEventListener("input", schedule);
    element.addEventListener("pve:inline-geometry", schedule);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("input", schedule);
      element.removeEventListener("pve:inline-geometry", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [element]);
  return (
    <div
      ref={anchor}
      className={`pve:pointer-events-auto pve:fixed pve:z-70 pve:left-[var(--pve-settings-x)] pve:top-[var(--pve-settings-y)] pve:rounded-lg pve:border pve:border-solid pve:shadow-md ${chrome.surface} ${chrome.border}`}
    >
      <Button
        size="icon"
        aria-label={`Options for ${label}`}
        title={`Options for ${label}`}
        onClick={onOpen}
      >
        <Settings2 size={17} aria-hidden="true" />
      </Button>
    </div>
  );
}
