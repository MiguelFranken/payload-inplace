"use client";

import type { Ref } from "react";
import { ArrowDown, ArrowUp, ListOrdered, MoreHorizontal } from "lucide-react";
import { useEditorMessages } from "../../localization/EditorMessages";
import { Button } from "../../primitives/button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../primitives/menu/menu";

/** Contextual controls for the selected block. The host supplies only legal destinations and available commands. */
export function BlockActions({
  triggerRef,
  onUp,
  onDown,
  onMove,
  showArrows,
  actions,
}: {
  triggerRef: Ref<HTMLButtonElement>;
  onUp?: () => void;
  onDown?: () => void;
  onMove?: () => void;
  showArrows: boolean;
  actions: readonly { id: string; label: string; onSelect: () => void }[];
}) {
  const { t } = useEditorMessages();
  return (
    <>
      {showArrows && (
        <>
          <Button
            size="compact-icon"
            variant="selection"
            aria-label={t("moveSectionUp")}
            tooltip={t("moveSectionUp")}
            disabled={!onUp}
            onClick={onUp}
          >
            <ArrowUp size={15} aria-hidden="true" />
          </Button>
          <Button
            size="compact-icon"
            variant="selection"
            aria-label={t("moveSectionDown")}
            tooltip={t("moveSectionDown")}
            disabled={!onDown}
            onClick={onDown}
          >
            <ArrowDown size={15} aria-hidden="true" />
          </Button>
        </>
      )}
      {(onMove || actions.length > 0) && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            ref={triggerRef}
            variant="selection"
            size="compact-icon"
            aria-label={t("moreSectionActions")}
          >
            <MoreHorizontal size={15} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {onMove && (
              <DropdownMenuItem onClick={onMove}>
                <ListOrdered size={16} aria-hidden="true" />
                {t("moveSectionToPosition")}
              </DropdownMenuItem>
            )}
            {actions.map(({ id, label, onSelect }) => (
              <DropdownMenuItem key={id} onClick={onSelect}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}

/** Position labels describe the final index in the same list as the current block. */
export function BlockPositions({
  positions,
}: {
  positions: readonly {
    index: number;
    label: string;
    onSelect: () => void;
  }[];
}) {
  const { t } = useEditorMessages();
  if (!positions.length)
    return (
      <p role="status" className="pve:my-0 pve:text-sm">
        {t("noSectionDestinations")}
      </p>
    );

  return (
    <ul className="pve:m-0 pve:grid pve:list-none pve:gap-1 pve:p-0">
      {positions.map(({ index, label, onSelect }) => (
        <li key={index}>
          <Button
            className="pve:min-h-10 pve:h-auto pve:w-full pve:justify-start pve:py-2 pve:text-start pve:leading-snug"
            onClick={onSelect}
          >
            <span className="pve:shrink-0 pve:rounded-md pve:bg-[var(--pve-muted-surface,#f4f5f7)] pve:px-2 pve:py-1 pve:text-xs pve:tabular-nums">
              {t("sectionPosition", { position: index + 1 })}
            </span>
            <span className="pve:min-w-0 pve:[overflow-wrap:anywhere]">
              {label}
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
