"use client";
import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, LoaderCircle } from "lucide-react";
import type { BlockIdentity } from "../types.js";
import { useSectionPatterns } from "./section-patterns.js";
import { useEditorMessages } from "./messages.js";
import { Button } from "./ui/button.js";
/** Explicit saved-section copy; cancelling the name form never changes native fields or history. */
export function SaveSectionPattern({
  identity,
  disabled,
}: {
  identity: BlockIdentity;
  disabled: boolean;
}) {
  const patterns = useSectionPatterns(),
    { t } = useEditorMessages();
  const [open, setOpen] = useState(false),
    [label, setLabel] = useState(""),
    [phase, setPhase] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  if (!patterns?.canSave) return null;
  async function save() {
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setPhase("saving");
    try {
      await patterns!.save(identity, label, controller.signal);
      if (!controller.signal.aborted) {
        setPhase("saved");
        setLabel("");
        setOpen(false);
      }
    } catch {
      if (!controller.signal.aborted) setPhase("error");
    }
  }
  return (
    <div className="pve:mt-3 pve:grid pve:gap-2">
      <Button
        variant="outline"
        disabled={disabled || phase === "saving"}
        onClick={() => {
          setOpen((value) => !value);
          setPhase("idle");
        }}
      >
        <BookmarkPlus size={16} />
        {t("saveSectionPattern")}
      </Button>
      {open && (
        <div className="pve:flex pve:flex-wrap pve:gap-2">
          <input
            aria-label={t("patternName")}
            placeholder={t("patternName")}
            value={label}
            maxLength={120}
            disabled={phase === "saving"}
            onChange={(event) => setLabel(event.target.value)}
            className="pve:min-w-0 pve:flex-1 pve:rounded-md pve:border pve:border-solid pve:border-[var(--pve-border,#dedee2)] pve:bg-transparent pve:p-2 pve:text-inherit"
          />
          <Button
            disabled={disabled || !label.trim() || phase === "saving"}
            onClick={() => void save()}
          >
            {phase === "saving" && (
              <LoaderCircle size={14} className="pve:animate-spin" />
            )}
            {t("savePatternCopy")}
          </Button>
        </div>
      )}
      {phase === "error" && (
        <p role="alert" className="pve:m-0 pve:text-xs">
          {t("patternFailed")}
        </p>
      )}
      {phase === "saved" && (
        <p role="status" className="pve:m-0 pve:text-xs">
          {t("patternSaved")}
        </p>
      )}
    </div>
  );
}
