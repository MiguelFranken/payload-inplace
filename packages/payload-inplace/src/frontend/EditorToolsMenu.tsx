"use client";

import type { Ref } from "react";
import {
  Check,
  History,
  LogOut,
  Minus,
  MoreHorizontal,
  PanelsTopLeft,
  Redo2,
  Undo2,
} from "lucide-react";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@payload-inplace/ui/primitives/menu/menu";
import { documentReference, targetDocumentKey } from "../state/document-target";
import { useDocumentScopes } from "./document-scope";
import { useVisualEditor, type ResolvedEditorExtension } from "./tools-context";

/** Dispatches dock actions to the controller. Native save and disclosure state stay with their existing owners. */
export function EditorToolsMenu({
  activeDocumentKey,
  triggerRef,
  canBrowseVersions,
  canUndo,
  canRedo,
  canSave,
  onExtension,
  onVersions,
  onUndo,
  onSave,
  onMinimize,
  onExit,
}: {
  activeDocumentKey: string;
  triggerRef: Ref<HTMLButtonElement>;
  canBrowseVersions: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canSave: boolean;
  onExtension: (extension: ResolvedEditorExtension) => void;
  onVersions: () => void;
  onUndo: (redo: boolean) => void;
  onSave: () => void;
  onMinimize: () => void;
  onExit: () => void;
}) {
  const { t } = useEditorMessages();
  const documentScopes = useDocumentScopes();
  const editorTools = useVisualEditor();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={triggerRef}
        aria-label={t("moreTools")}
        title={t("moreTools")}
      >
        <MoreHorizontal size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {documentScopes.scopes.length > 1 && (
          <>
            {documentScopes.scopes.map((scope) => (
              <DropdownMenuItem
                key={targetDocumentKey(scope.target)}
                aria-current={
                  targetDocumentKey(scope.target) === activeDocumentKey
                    ? "true"
                    : undefined
                }
                disabled={documentScopes.phase !== "idle"}
                onClick={() =>
                  documentScopes.request(documentReference(scope.target))
                }
              >
                {targetDocumentKey(scope.target) === activeDocumentKey ? (
                  <Check size={16} />
                ) : (
                  <PanelsTopLeft size={16} />
                )}
                <span>{scope.label}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        {editorTools.extensions
          .filter((e) => e.showInDock !== false)
          .map((e) => (
            <DropdownMenuItem key={e.id} onClick={() => onExtension(e)}>
              <PanelsTopLeft size={16} />
              {e.label}
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />
        {editorTools.tools.includes("history") && (
          <>
            <DropdownMenuItem
              disabled={!canBrowseVersions}
              onClick={onVersions}
            >
              <History size={16} />
              {t("savedVersions")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canUndo} onClick={() => onUndo(false)}>
              <Undo2 size={16} />
              {t("undoSectionChange")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canRedo} onClick={() => onUndo(true)}>
              <Redo2 size={16} />
              {t("redoSectionChange")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem disabled={!canSave} onClick={onSave}>
          <Check size={16} />
          {t("saveDraftNow")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="pve:sm:hidden" onClick={onMinimize}>
          <Minus size={16} />
          {t("minimizeEditor")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExit}>
          <LogOut size={16} />
          {t("exitEditing")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
