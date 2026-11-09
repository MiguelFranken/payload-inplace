"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PROTOCOL, validateMessage } from "./protocol";
import { elementRect } from "./geometry";
import "./styles.css";

/** Mount once, exclusively after current authorization and explicit activation on the private preview. */
export function PreviewBridge({
  session,
  documentKey,
  revision,
  origin,
  expires,
}: {
  session: string;
  documentKey: string;
  revision: string;
  origin: string;
  expires: number;
}) {
  const router = useRouter();
  const counters = useRef({ sent: 0, received: -1 });
  useEffect(() => {
    let frame = 0;
    let selected: Element | null = null;
    let stopped = false;
    const overlay = document.createElement("div");
    overlay.setAttribute("data-ve-overlay", "");
    overlay.className =
      "pvp:fixed pvp:pointer-events-none pvp:z-[2147483645] pvp:hidden pvp:border-2 pvp:border-solid pvp:border-[var(--pve-accent,#3155fa)] pvp:left-[var(--pve-left)] pvp:top-[var(--pve-top)] pvp:w-[var(--pve-width)] pvp:h-[var(--pve-height)]";
    document.body.append(overlay);
    const send = (payload: any) => {
      if (!stopped)
        window.parent.postMessage(
          {
            protocol: PROTOCOL,
            session,
            document: documentKey,
            sequence: counters.current.sent++,
            ...payload,
          },
          origin,
        );
    };
    const draw = () => {
      frame = 0;
      const rect = selected?.isConnected ? elementRect(selected) : null;
      if (!rect) {
        overlay.classList.add("pvp:hidden");
        return;
      }
      overlay.classList.remove("pvp:hidden");
      overlay.style.setProperty("--pve-left", `${rect.left}px`);
      overlay.style.setProperty("--pve-top", `${rect.top}px`);
      overlay.style.setProperty("--pve-width", `${rect.width}px`);
      overlay.style.setProperty("--pve-height", `${rect.height}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    const click = (event: MouseEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const block = (event.target as Element)?.closest("[data-ve-block]");
      if (!block) return;
      selected = block;
      schedule();
      let ancestors: string[] = [];
      try {
        ancestors = JSON.parse(block.getAttribute("data-ve-ancestors") || "[]");
      } catch {
        return;
      }
      send({
        type: "select",
        identity: {
          root: block.getAttribute("data-ve-root"),
          blockId: block.getAttribute("data-ve-block"),
          ancestors,
        },
      });
    };
    // The host must also suppress business capabilities in its renderers; capture guards accidental native forms.
    const submit = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const message = (event: MessageEvent) => {
      if (
        !validateMessage(event, {
          source: window.parent,
          origin,
          session,
          document: documentKey,
          after: counters.current.received,
        })
      )
        return;
      counters.current.received = event.data.sequence;
      if (event.data.type === "stop") {
        dispose();
        return;
      }
      if (event.data.type === "refresh") router.refresh();
      if (event.data.type === "highlight") {
        const identity = event.data.identity;
        selected =
          [...document.querySelectorAll("[data-ve-block]")].find(
            (el) =>
              el.getAttribute("data-ve-block") === identity.blockId &&
              el.getAttribute("data-ve-root") === identity.root &&
              el.getAttribute("data-ve-ancestors") ===
                JSON.stringify(identity.ancestors ?? []),
          ) ?? null;
        selected?.scrollIntoView({ block: "nearest" });
        schedule();
      }
    };
    const expiry = setTimeout(
      () => {
        dispose();
        window.location.replace("/admin");
      },
      Math.max(0, expires - Date.now()),
    );
    function dispose() {
      if (stopped) return;
      stopped = true;
      clearTimeout(expiry);
      cancelAnimationFrame(frame);
      observer.disconnect();
      overlay.remove();
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", submit, true);
      window.removeEventListener("message", message);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    }
    document.addEventListener("click", click, true);
    document.addEventListener("submit", submit, true);
    window.addEventListener("message", message);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    send({ type: "ready", revision });
    send({ type: "rendered", revision });
    return dispose;
  }, [session, documentKey, revision, origin, expires, router]);
  return null;
}
