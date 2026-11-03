"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RenderFields,
  useLocale,
  PublishButton,
  useConfig,
  useDocumentInfo,
  useField,
  useForm,
  useFormBackgroundProcessing,
  useFormFields,
  useFormModified,
  useFormProcessing,
  useTranslation,
} from "@payloadcms/ui";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Layers,
  MousePointer2,
  Redo2,
  Trash2,
  Undo2,
  Pencil,
  PanelsTopLeft,
  MoreHorizontal,
  CloudUpload,
  AlertTriangle,
  Check,
  Minus,
  LogOut,
} from "lucide-react";
import type { BlocksFieldClientProps, ClientBlock } from "payload";
import type { Activation } from "../types.js";
import { availableBlocks } from "../schema/available-blocks.js";
import { canUpdateInlineField } from "../schema/inline-access.js";
import { collectSections } from "../schema/tree.js";
import { sectionHeading } from "../schema/section-heading.js";
import { StructuralHistory } from "../state/history.js";
import {
  applyCommand,
  ownsTypingOrModal,
  restoreRoot,
} from "../adapters/payload-form.js";
import { structureTransitionError } from "../state/policy.js";
import type { StructuralPolicy } from "../state/policy.js";
import { ReviewPublishButton } from "../admin/ReviewPublishButton.js";
import { installNativeUploadLabels } from "../admin/native-accessibility.js";
import { useEditorRecovery } from "./recovery.js";
import {
  namedField,
  projectFields,
  excludeFields,
  fieldOwnershipPaths,
} from "../schema/project-fields.js";
import { InlineText } from "./InlineText.js";
import { usePreviewStatus } from "./preview-status.js";
import { SelectionSettings } from "./SelectionSettings.js";
import { ExtensionAction } from "./ExtensionAction.js";
import { Floatable } from "./Floatable.js";
import { useVisualEditor } from "./tools-context.js";
import { NativeFieldsOwner, NativeFieldSlot } from "./field-ownership.js";
import { InspectionLayer, type InspectionTarget } from "./InspectionLayer.js";

import { Button as ChromeButton } from "./ui/button.js";
import { ChromePortalProvider } from "./ui/portal.js";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "./ui/menu.js";
import { BlockReorder, sectionElement } from "./BlockReorder.js";
import type { NativeSection } from "../schema/tree.js";
/** Floating authoring controls share one native Form. Selecting a field changes its sole mounted owner instead of duplicating inputs. */
export function FrontendControls({
  context,
  field,
  blockControls,
  permissions,
  policy,
  exitURL,
}: {
  context: Activation;
  field: BlocksFieldClientProps["field"];
  blockControls?: import("../types.js").VisualEditorOptions["blockControls"];
  permissions: any;
  policy?: StructuralPolicy;
  exitURL: string;
  renderedRevision: string | number;
}) {
  const recovery = useEditorRecovery();
  const serverPreview = usePreviewStatus();
  const editorTools = useVisualEditor();
  const [expanded, setExpanded] = useState(true);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [customTool, setCustomTool] = useState<string | null>(null);
  const [validationPath, setValidationPath] = useState<string | null>(null);
  const locale = useLocale();
  const closeTools = useCallback(() => {
    editorTools.openPanels.forEach(editorTools.closePanel);
    setCustomTool(null);
    setValidationPath(null);
  }, [editorTools.openPanels, editorTools.closePanel]);
  useEffect(() => {
    if (editorTools.openPanels.length) {
      setOutline(false);
      setSettingsOpen(false);
      setCustomTool(null);
      setValidationPath(null);
    }
  }, [editorTools.openPanels]);
  useEffect(() => {
    if (validationPath && recovery.failure?.kind !== "validation") {
      setValidationPath(null);
      queueMicrotask(() => toolsButton.current?.focus());
    }
  }, [recovery.failure, validationPath]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const feedbackStack = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLElement>(null),
    rootElement = useRef<HTMLDivElement>(null);
  const [actionResult, setActionResult] = useState("");
  const [reopening, setReopening] = useState(false);
  const form = useForm(),
    info = useDocumentInfo(),
    { config } = useConfig(),
    { i18n } = useTranslation();
  const t = (en: string, de: string) => (i18n.language === "de" ? de : en);
  const [inspecting, setInspecting] = useState(() =>
      editorTools.tools.includes("content"),
    ),
    [selection, setSelection] = useState<InspectionTarget>(),
    [outline, setOutline] = useState(false),
    [error, setError] = useState("");
  const [highlighting, setHighlighting] = useState(false);
  const [generation, setGeneration] = useState(0);
  const inspector = useRef<HTMLElement>(null),
    inspectButton = useRef<HTMLButtonElement>(null),
    sectionsButton = useRef<HTMLButtonElement>(null),
    toolsButton = useRef<HTMLButtonElement>(null),
    launcherButton = useRef<HTMLButtonElement>(null);
  const modified = useFormModified(),
    processing = useFormProcessing(),
    background = useFormBackgroundProcessing();
  const rootState = useField({ path: context.target.root, hasRows: true });
  const nativeBlockChoices = availableBlocks(
    field,
    config.blocksMap as Record<string, ClientBlock>,
    rootState.blocksFilterOptions,
  );
  const currentRows = form.getDataByPath(context.target.root);
  const rootRows = Array.isArray(currentRows) ? currentRows : [];
  const atStart = (slug: string) =>
    policy?.first === slug && rootRows[0]?.blockType !== slug;
  const blockChoices = nativeBlockChoices.filter(
    (block) =>
      !structureTransitionError(
        rootRows,
        atStart(block.slug)
          ? [{ blockType: block.slug }, ...rootRows]
          : [...rootRows, { blockType: block.slug }],
        policy,
      ),
  );
  const fingerprint = useFormFields(([fields]) =>
    Object.entries(fields)
      .filter(
        ([path, state]) => path.startsWith(context.target.root) && state.rows,
      )
      .map(
        ([path, state]) =>
          `${path}:${state.rows?.map((r) => `${r.id}:${r.blockType}`).join(",")}`,
      )
      .join("|"),
  );
  const sections = useMemo(
    () =>
      collectSections({
        field,
        data: form.getDataByPath(context.target.root),
        root: context.target.root,
        schemaPath: `${context.target.collection}.${context.target.root}`,
        permissions,
        blocksMap: config.blocksMap as Record<string, ClientBlock>,
      }),
    [fingerprint, generation, info.data?.updatedAt, outline],
  );
  const selected = sections.find(
    (s) =>
      s.identity.blockId === selection?.identity.blockId &&
      JSON.stringify(s.identity.ancestors) ===
        JSON.stringify(selection?.identity.ancestors || []),
  );
  const disabled = Boolean(
    (recovery.failure?.kind !== "validation" && recovery.failure) ||
      processing ||
      field.admin?.readOnly ||
      permissions === false ||
      (permissions !== true && permissions?.update === false) ||
      form.disabled ||
      !info.hasSavePermission ||
      selected?.readOnly,
  );
  const saveDraft = useCallback(async () => {
    if (disabled || !modified || background) return;
    form.setBackgroundProcessing(true);
    try {
      await form.submit({
        action: `${config.routes.api}/${context.target.collection}/${context.target.id}?locale=${encodeURIComponent(locale.code)}&depth=0&fallback-locale=null&draft=true`,
        method: "PATCH",
        overrides: { _status: "draft" },
        acceptValues: true,
        disableFormWhileProcessing: false,
        disableSuccessStatus: true,
        skipValidation: true,
      });
    } finally {
      form.setBackgroundProcessing(false);
    }
  }, [
    disabled,
    modified,
    background,
    form,
    config.routes.api,
    context.target.collection,
    context.target.id,
    locale.code,
  ]);
  const history = useMemo(
    () => new StructuralHistory(context.target.root),
    [context.nonce],
  );
  useEffect(() => {
    if (history.captureResult(form.getFields())) setGeneration((n) => n + 1);
  }, [fingerprint, history]);
  const initialToolApplied = useRef(false);
  useEffect(() => {
    if (initialToolApplied.current) return;
    initialToolApplied.current = true;
    const tool = new URLSearchParams(window.location.search).get("tool");
    if (tool === "content" && editorTools.tools.includes("content"))
      setInspecting(true);
    if (tool === "sections" && editorTools.tools.includes("sections"))
      setOutline(true);
    if (tool?.startsWith("panel:")) editorTools.openPanel(tool.slice(6));
  }, []);
  const pick = useCallback(
    (target: InspectionTarget) => {
      if (target.identity.root !== context.target.root) return;
      closeTools();
      setSelection(target);
      setSettingsOpen(false);
      setOutline(false);
    },
    [context.nonce, closeTools],
  );
  useEffect(() => {
    if (rootElement.current)
      return installNativeUploadLabels(
        rootElement.current,
        i18n.language === "de",
      );
  }, [i18n.language]);
  useEffect(() => {
    if (settingsOpen && selected && inspector.current)
      requestAnimationFrame(() =>
        inspector.current
          ?.querySelector<HTMLElement>(
            "input:not([type=hidden]),textarea,[contenteditable=true]",
          )
          ?.focus({ preventScroll: true }),
      );
  }, [selected?.path, selection?.field, settingsOpen]);
  function undo(redo = false) {
    if (disabled) return;
    const snapshot = redo
      ? history.redo(form.getFields())
      : history.undo(form.getFields());
    if (snapshot) {
      const issue = restoreRoot(form, context.target.root, snapshot);
      setError(issue || "");
      setGeneration((n) => n + 1);
    }
  }
  useEffect(() => {
    if (!expanded) return;
    const keyboard = (event: KeyboardEvent) => {
      const target = event.composedPath()[0] as EventTarget;
      if (event.defaultPrevented) return;
      const nested =
        target instanceof Element &&
        target.closest('[role="dialog"],dialog[open],.drawer');
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        if (nested) return;
        event.preventDefault();
        void saveDraft();
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        !ownsTypingOrModal(target) &&
        ["z", "y"].includes(event.key.toLowerCase())
      ) {
        event.preventDefault();
        undo(event.shiftKey || event.key.toLowerCase() === "y");
      }
      if (
        event.key === "Escape" &&
        !nested &&
        !(
          target instanceof Element &&
          target.closest(
            '[role="menu"],[role="listbox"],[data-ve-select-popup]',
          )
        )
      ) {
        const focus =
          validationPath || customTool || editorTools.openPanels.length
            ? toolsButton.current
            : outline
              ? sectionsButton.current
              : inspectButton.current;
        setSelection(undefined);
        setSettingsOpen(false);
        setOutline(false);
        closeTools();
        requestAnimationFrame(() => focus?.focus());
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [
    disabled,
    history,
    expanded,
    saveDraft,
    closeTools,
    customTool,
    validationPath,
    editorTools.openPanels,
    outline,
  ]);
  function commandFor(
    section: NativeSection,
    command: import("../adapters/payload-form.js").BlockCommand,
  ) {
    const result = applyCommand(
      form,
      context.target.root,
      section.containerSchemaPath,
      command,
      {
        disabled: disabled || section.readOnly,
        min: section.field.minRows ?? (section.field.required ? 1 : 0),
        max: section.field.maxRows,
        allowed: availableBlocks(
          section.field,
          config.blocksMap as Record<string, ClientBlock>,
          form.getField(section.parent)?.blocksFilterOptions,
        ).map((b) => b.slug),
        policy: section.parent === context.target.root ? policy : undefined,
        history,
        container: section.parent,
      },
    );
    setError(result || "");
    setGeneration((n) => n + 1);
    return result;
  }
  function action(type: "up" | "down" | "duplicate" | "remove") {
    if (!selected) return;
    const error = commandFor(selected, { type, identity: selected.identity });
    if (!error && type === "remove") setSelection(undefined);
  }
  function pickSection(section: NativeSection, settings = false) {
    const element = sectionElement(section);
    if (!element) {
      closeTools();
      setOutline(false);
      setSelection({ identity: section.identity, element: document.body });
      setSettingsOpen(true);
      return;
    }
    element.scrollIntoView({
      block: "center",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    if (!settings) {
      const profile = blockControls?.[section.block?.slug || ""];
      const fields = section.block
        ? projectFields(section.block.fields, profile?.fields)
        : [];
      const bound = [
        ...element.querySelectorAll<HTMLElement>("[data-ve-field]"),
      ].find((node) => {
        const name = node.getAttribute("data-ve-field") || "",
          candidate = namedField(fields, name),
          state = form.getField(`${section.path}.${name}`);
        return (
          node.getAttribute("data-ve-root") === section.identity.root &&
          node.getAttribute("data-ve-ancestors") ===
            JSON.stringify(section.identity.ancestors || []) &&
          node.getAttribute("data-ve-block") === section.identity.blockId &&
          Boolean(state) &&
          canUpdateInlineField(section.permissions, name) &&
          candidate &&
          ["text", "textarea"].includes(candidate.type) &&
          !(candidate.admin as any)?.components?.Field &&
          candidate.admin?.readOnly !== true &&
          !("hasMany" in candidate && candidate.hasMany) &&
          profile?.inlineEdit !== false &&
          (!Array.isArray(profile?.inlineEdit) ||
            profile.inlineEdit.includes(name)) &&
          state?.passesCondition !== false &&
          node.childElementCount === 0 &&
          !node.closest("a,button,input,textarea,select")
        );
      });
      if (bound) {
        pick({
          element: bound,
          field: bound.getAttribute("data-ve-field")!,
          identity: section.identity,
        });
        return;
      }
    }
    pick({ element, identity: section.identity });
    setSettingsOpen(true);
  }
  async function exit() {
    if (
      modified &&
      !window.confirm(
        t(
          "Leave the editor? Changes that have not finished saving may be lost.",
          "Editor verlassen? Noch nicht gespeicherte Änderungen können verloren gehen.",
        ),
      )
    )
      return;
    await fetch(`${config.routes.api}/visual-editor/deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonce: context.nonce }),
    });
    window.location.assign(exitURL);
  }
  async function reopenEditor() {
    if (
      (modified || background) &&
      !window.confirm(
        t(
          "Open the latest saved draft? Download your working copy first: unsaved changes will not carry over.",
          "Letzten gespeicherten Entwurf öffnen? Zuerst die Arbeitskopie herunterladen: Ungespeicherte Änderungen werden nicht übernommen.",
        ),
      )
    )
      return;
    setReopening(true);
    setError("");
    try {
      const response = await fetch(
        `${config.routes.api}/visual-editor/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(context.target),
        },
      );
      if (!response.ok) throw new Error("activation denied");
      const { context: fresh } = await response.json();
      const next = new URL(window.location.href);
      next.searchParams.set("context", fresh.nonce);
      window.location.assign(next.href);
    } catch {
      setError(
        t(
          "Could not reopen the editor. Your working copy is still here. Sign in in a new tab, then try again. If access was removed, contact your administrator.",
          "Editor konnte nicht erneut geöffnet werden. Deine Arbeitskopie bleibt erhalten. Melde dich in einem neuen Tab an und versuche es erneut. Bei entzogenem Zugriff wende dich an die Administration.",
        ),
      );
      setReopening(false);
    }
  }
  useEffect(() => {
    const timer = setTimeout(
      () => {
        form.setDisabled(true);
        setInspecting(false);
        recovery.setFailure({
          kind: "session",
          message: t(
            "Editing session expired. Download your working copy before reopening the editor.",
            "Sitzung abgelaufen. Arbeitskopie vor dem erneuten Öffnen herunterladen.",
          ),
        });
      },
      Math.max(0, context.expires - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [context.expires]);
  function downloadWorkingCopy() {
    const data = { ...form.getData() };
    delete data._veActivation;
    delete data._veReviewToken;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${context.target.collection}-${context.target.id}-working-copy.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function retry() {
    try {
      const response = await fetch(recovery.statusURL, { cache: "no-store" });
      if (!response.ok) {
        recovery.setFailure({
          kind: "session",
          message: t(
            "Editing access expired or was revoked. Download your working copy before signing in again.",
            "Bearbeitungszugriff abgelaufen oder entzogen. Arbeitskopie vor der erneuten Anmeldung herunterladen.",
          ),
        });
        return;
      }
      const status = await response.json(),
        expected = form.getData()._veRevision ?? info.data?.updatedAt;
      if (status.revision !== expected) {
        recovery.setFailure({
          kind: "conflict",
          message: t(
            "The saved draft changed. Download your working copy, then reload the latest draft to reconcile your changes.",
            "Der gespeicherte Entwurf wurde geändert. Arbeitskopie herunterladen und aktuellen Entwurf zum Abgleichen laden.",
          ),
        });
        return;
      }
      recovery.setFailure(null);
      form.setDisabled(false);
      form.setModified(true);
    } catch {
      /* Keep the visible recovery action; never start an automatic retry loop. */
    }
  }
  useEffect(() => {
    editorTools.setSelection(selection?.identity);
  }, [selection]);
  useEffect(() => {
    if (!feedbackStack.current || !rootElement.current) return;
    const observer = new ResizeObserver(() =>
      rootElement.current?.style.setProperty(
        "--pve-dock-height",
        `${feedbackStack.current?.offsetHeight || 56}px`,
      ),
    );
    observer.observe(feedbackStack.current);
    return () => observer.disconnect();
  }, []);
  const describe = useCallback(
    (target: InspectionTarget) => {
      const section = sections.find(
        (s) =>
          s.identity.blockId === target.identity.blockId &&
          JSON.stringify(s.identity.ancestors) ===
            JSON.stringify(target.identity.ancestors || []),
      );
      const field = section?.block?.fields.find(
        (f) => "name" in f && f.name === target.field,
      );
      const label =
        field && "label" in field
          ? field.label
          : section?.block?.labels?.singular;
      return typeof label === "string"
        ? label
        : target.field
          ? target.field
              .replace(/([a-z])([A-Z])/g, "$1 $2")
              .replace(/^./, (c) => c.toUpperCase())
          : t("Content section", "Inhaltsabschnitt");
    },
    [sections, i18n.language],
  );
  const fixedSelected = Boolean(
    selected &&
      selected.parent === context.target.root &&
      selected.index === 0 &&
      selected.block?.slug === policy?.first,
  );
  const uniqueSelected = Boolean(
    selected &&
      selected.parent === context.target.root &&
      policy?.exactlyOne?.includes(selected.block?.slug || ""),
  );
  const label = selected?.block?.labels?.singular;
  const title =
    typeof label === "string"
      ? label
      : selected?.block?.slug || t("Section", "Abschnitt");
  const profile = blockControls?.[selected?.block?.slug || ""];
  const configuredFields = selected?.block
    ? projectFields(selected.block.fields, profile?.fields)
    : [];
  const candidate = selection?.field
    ? namedField(configuredFields, selection.field)
    : undefined;
  const quickField =
    candidate &&
    ["text", "textarea"].includes(candidate.type) &&
    profile?.inlineEdit !== false &&
    (!Array.isArray(profile?.inlineEdit) ||
      profile.inlineEdit.includes(selection?.field || ""))
      ? candidate
      : undefined;
  const inlineEligible = useMemo(
    () =>
      Boolean(
        quickField &&
          selection?.element instanceof HTMLElement &&
          selection.element.childElementCount === 0 &&
          !selection.element.closest("a,button,input,textarea,select") &&
          !(quickField.admin as any)?.components?.Field,
      ),
    [quickField, selection?.element],
  );
  const inlineState = useFormFields(([fields]) =>
    selected && selection?.field
      ? fields[`${selected.path}.${selection.field}`]
      : undefined,
  );
  const canInline =
    inlineEligible &&
    Boolean(inlineState) &&
    inlineState?.passesCondition !== false &&
    !inlineState?.customComponents?.Field &&
    !(quickField && "hasMany" in quickField && quickField.hasMany) &&
    canUpdateInlineField(selected?.permissions, selection?.field || "") &&
    quickField?.admin?.readOnly !== true;
  useEffect(() => {
    if (selection?.field && !canInline && !disabled) setSettingsOpen(true);
  }, [selection?.element, selection?.field, canInline, disabled]);
  const fields = canInline
    ? excludeFields(configuredFields, [selection!.field!])
    : candidate && selection?.field
      ? projectFields(configuredFields, [selection.field])
      : configuredFields;

  const extension = editorTools.extensions.find(
    (e) => e.id === (customTool || editorTools.openPanels.at(-1)),
  );
  const hasPanel =
    expanded &&
    (outline ||
      (selected && settingsOpen) ||
      Boolean(extension) ||
      Boolean(validationPath));
  function minimize() {
    closeTools();
    setExpanded(false);
    requestAnimationFrame(() => launcherButton.current?.focus());
    setInspecting(false);
    setSettingsOpen(false);
    setSelection(undefined);
  }
  function validationLabel(path: string) {
    const section = sections
      .filter((section) => path.startsWith(section.path + "."))
      .sort((a, b) => b.path.length - a.path.length)[0];
    const relative = section ? path.slice(section.path.length + 1) : path;
    const field = namedField(
      section?.block?.fields || info.docConfig?.fields || [],
      relative.replace(/\.\d+(?=\.|$)/g, ""),
    );
    const label = field && "label" in field ? field.label : undefined;
    const text =
      typeof label === "string"
        ? label
        : label && typeof label === "object"
          ? label[i18n.language] || label.en
          : undefined;
    return (
      text ||
      (relative.split(".").at(-1) || t("Field", "Feld"))
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, (c) => c.toUpperCase())
    );
  }
  function correctField(path: string) {
    closeTools();
    setSettingsOpen(false);
    setSelection(undefined);
    setExpanded(true);
    if (path === context.target.root) setOutline(true);
    else {
      setOutline(false);
      setValidationPath(path);
    }
  }
  const validationMessage = useFormFields(([fields]) =>
    validationPath
      ? fields[validationPath]?.errorMessage ||
        recovery.failure?.fieldErrors?.[validationPath]
      : undefined,
  );
  const statusText = recovery.failure
    ? t("Not saved", "Nicht gespeichert")
    : processing || background
      ? t("Saving…", "Wird gespeichert…")
      : modified
        ? t("Unsaved changes", "Ungespeicherte Änderungen")
        : recovery.attempt > recovery.acknowledged.current
          ? t("Confirming save…", "Speichern wird bestätigt…")
          : t("Draft saved", "Entwurf gespeichert");
  return (
    <ChromePortalProvider container={portalContainer}>
      <div
        ref={rootElement}
        role="region"
        aria-label="Website editor"
        data-ve-ui=""
        className="pve:fixed pve:inset-0 pve:pointer-events-none pve:z-[var(--pve-z-index,2147483000)] pve:font-[family-name:var(--pve-font-family,system-ui)] pve:text-[var(--pve-text,var(--theme-text,#202127))] pve:[&_[class*='upload-relationship-details']_button]:min-h-11! pve:[&_[class*='upload-relationship-details']_button]:min-w-11! pve:[&_[class*='upload-relationship-details']_[class*='meta']]:text-[var(--theme-elevation-700)]! pve:[&_[class*='dragAndDropText']]:text-[var(--theme-elevation-700)]! pve:[&_[class*='orText']]:text-[var(--theme-elevation-700)]! pve:[&_.clear-indicator]:min-h-10! pve:[&_.clear-indicator]:min-w-10! pve:[&_.dropdown-indicator]:min-h-10! pve:[&_.dropdown-indicator]:min-w-10!"
      >
        {expanded && (
          <InspectionLayer
            inspecting={inspecting && !hasPanel && !recovery.failure}
            highlighting={highlighting && !hasPanel}
            selected={outline ? undefined : selection}
            onPick={pick}
            describe={describe}
          />
        )}
        {expanded && selected && selection && canInline && (
          <NativeFieldsOwner
            key={`${selected.path}.${selection.field}`}
            path={`${selected.path}.${selection.field}`}
            activate={() => (selection.element as HTMLElement).focus()}
          >
            <InlineText
              key={`${selected.path}.${selection.field}`}
              element={selection.element as HTMLElement}
              path={`${selected.path}.${selection.field}`}
              label={describe(selection)}
              multiline={quickField?.type === "textarea"}
              point={selection.point}
              disabled={disabled}
            />
          </NativeFieldsOwner>
        )}
        {expanded && selected && selection && !hasPanel && (
          <SelectionSettings
            element={selection.element}
            label={describe(selection)}
            onOpen={() => {
              (document.activeElement as HTMLElement)?.blur();
              closeTools();
              setOutline(false);
              setSettingsOpen(true);
            }}
          />
        )}
        {expanded && outline && (
          <BlockReorder
            sections={sections}
            getHeading={(section) => sectionHeading(section, form.getFields())}
            disabled={disabled}
            canvas
            onMove={(a, b) =>
              commandFor(a, {
                type: "move",
                identity: a.identity,
                over: b.identity,
              })
            }
            onPick={pickSection}
            onSettings={(section) => pickSection(section, true)}
            lockedReason={(s) =>
              s.parent === context.target.root &&
              s.index === 0 &&
              s.block?.slug === policy?.first
                ? "This section stays first"
                : undefined
            }
          />
        )}
        <div
          data-ve-panel-stack=""
          className="pve:fixed pve:right-3 pve:bottom-[calc(var(--pve-dock-height,56px)+24px)] pve:z-60 pve:sm:right-5"
        >
          {expanded &&
            validationPath &&
            recovery.failure?.kind === "validation" && (
              <Floatable
                key={validationPath}
                title={t("Fix field", "Feld korrigieren")}
                returnFocus={toolsButton}
                onClose={() => setValidationPath(null)}
              >
                <div className="pve:grid pve:gap-4">
                  {validationMessage && (
                    <p
                      role="alert"
                      className="pve:m-0 pve:text-sm pve:leading-relaxed"
                    >
                      {validationMessage}
                    </p>
                  )}
                  <NativeFieldSlot path={validationPath} />
                  <ChromeButton
                    className="pve:justify-self-start"
                    variant="default"
                    onClick={() => void retry()}
                  >
                    {t("Retry saving", "Erneut speichern")}
                  </ChromeButton>
                </div>
              </Floatable>
            )}
          {expanded && selected && settingsOpen && !outline && (
            <Floatable
              title={title}
              label="Edit content"
              returnFocus={inspectButton}
              onBack={
                editorTools.tools.includes("sections")
                  ? () => {
                      setSettingsOpen(false);
                      setOutline(true);
                    }
                  : undefined
              }
              onClose={() => {
                setSettingsOpen(false);
                inspectButton.current?.focus();
              }}
            >
              <div
                ref={(node) => {
                  inspector.current = node;
                }}
              >
                {fields ? (
                  <NativeFieldsOwner
                    key={`${selected.path}:${quickField ? selection?.field : "all"}`}
                    paths={fieldOwnershipPaths(fields, selected.path)}
                  >
                    <RenderFields
                      fields={fields}
                      parentPath={selected.path}
                      parentSchemaPath={selected.schemaPath}
                      parentIndexPath=""
                      permissions={selected.permissions}
                      readOnly={disabled}
                      forceRender
                    />
                  </NativeFieldsOwner>
                ) : (
                  <p>
                    This block is unavailable. Existing content is retained.
                  </p>
                )}
                {selection?.field ? (
                  <ChromeButton
                    variant="outline"
                    onClick={() =>
                      setSelection((s) => (s ? { ...s, field: undefined } : s))
                    }
                  >
                    {t(
                      "Edit all section fields",
                      "Alle Abschnittsfelder bearbeiten",
                    )}
                  </ChromeButton>
                ) : (
                  <nav
                    aria-label="Section actions"
                    className="pve:mt-4 pve:flex pve:gap-1"
                  >
                    <ChromeButton
                      size="icon"
                      aria-label="Move section up"
                      disabled={disabled || selected.index === 0}
                      onClick={() => action("up")}
                    >
                      <ArrowUp size={16} />
                    </ChromeButton>
                    <ChromeButton
                      size="icon"
                      aria-label="Move section down"
                      disabled={disabled || fixedSelected}
                      onClick={() => action("down")}
                    >
                      <ArrowDown size={16} />
                    </ChromeButton>
                    <ChromeButton
                      size="icon"
                      aria-label="Duplicate section"
                      disabled={disabled || uniqueSelected}
                      onClick={() => action("duplicate")}
                    >
                      <Copy size={16} />
                    </ChromeButton>
                    <ChromeButton
                      size="icon"
                      variant="destructive"
                      aria-label="Remove section"
                      disabled={disabled || fixedSelected || uniqueSelected}
                      onClick={() => action("remove")}
                    >
                      <Trash2 size={16} />
                    </ChromeButton>
                  </nav>
                )}
              </div>
            </Floatable>
          )}
          {expanded && outline && (
            <Floatable
              title={t("Sections", "Abschnitte")}
              label="Sections"
              returnFocus={sectionsButton}
              actions={
                editorTools.tools.includes("history") ? (
                  <>
                    <ChromeButton
                      size="icon"
                      aria-label="Undo section change"
                      title="Undo last section change"
                      disabled={disabled || !history.canUndo}
                      onClick={() => undo()}
                    >
                      <Undo2 size={16} />
                    </ChromeButton>
                    <ChromeButton
                      size="icon"
                      aria-label="Redo section change"
                      title="Redo section change"
                      disabled={disabled || !history.canRedo}
                      onClick={() => undo(true)}
                    >
                      <Redo2 size={16} />
                    </ChromeButton>
                  </>
                ) : undefined
              }
              onClose={() => setOutline(false)}
            >
              <p className="pve:mb-3 pve:mt-0 pve:text-xs pve:leading-5 pve:text-[var(--pve-muted,var(--theme-elevation-700,#646773))]">
                {t(
                  "Drag to reorder here or on the page.",
                  "Hier oder auf der Seite zum Sortieren ziehen.",
                )}
              </p>
              <div className="pve:grid pve:gap-2">
                <BlockReorder
                  sections={sections}
                  getHeading={(section) =>
                    sectionHeading(section, form.getFields())
                  }
                  disabled={disabled}
                  onMove={(a, b) =>
                    commandFor(a, {
                      type: "move",
                      identity: a.identity,
                      over: b.identity,
                    })
                  }
                  onPick={pickSection}
                  onSettings={(section) => pickSection(section, true)}
                  lockedReason={(s) =>
                    s.parent === context.target.root &&
                    s.index === 0 &&
                    s.block?.slug === policy?.first
                      ? "This section stays first"
                      : undefined
                  }
                />
              </div>
              <div className="pve:mt-4 pve:border-0 pve:border-t pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:pt-3">
                <label
                  id="pve-add-section-label"
                  className="pve:mb-2 pve:block pve:text-xs pve:font-medium"
                >
                  {t("Add section", "Abschnitt hinzufügen")}
                </label>
                <Select
                  value={null}
                  items={blockChoices.map((b) => ({
                    value: b.slug,
                    label:
                      typeof b.labels?.singular === "string"
                        ? b.labels.singular
                        : b.slug,
                  }))}
                  onValueChange={(value) => {
                    if (!value) return;
                    const result = applyCommand(
                      form,
                      context.target.root,
                      `${context.target.collection}.${context.target.root}`,
                      {
                        type: "add",
                        blockType: value,
                        at: atStart(value) ? "start" : "end",
                      },
                      {
                        disabled,
                        min: field.minRows ?? 0,
                        max: field.maxRows,
                        allowed: blockChoices.map((b) => b.slug),
                        policy,
                        history,
                      },
                    );
                    setError(result || "");
                    setGeneration((n) => n + 1);
                  }}
                >
                  <SelectTrigger
                    aria-labelledby="pve-add-section-label"
                    disabled={
                      disabled ||
                      blockChoices.length === 0 ||
                      (field.maxRows !== undefined &&
                        rootRows.length >= field.maxRows)
                    }
                  >
                    <SelectValue
                      placeholder={t("Choose a section…", "Abschnitt wählen…")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {blockChoices.map((b) => (
                      <SelectItem key={b.slug} value={b.slug}>
                        {typeof b.labels?.singular === "string"
                          ? b.labels.singular
                          : b.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Floatable>
          )}
          {expanded && extension && !outline && !settingsOpen && (
            <Floatable
              title={extension.label}
              returnFocus={toolsButton}
              width={extension.width}
              onClose={() => {
                editorTools.closePanel(extension.id);
                setCustomTool(null);
              }}
            >
              {extension.kind === "action" ? (
                <ExtensionAction
                  extension={extension}
                  onResult={setActionResult}
                />
              ) : (
                extension.content
              )}
            </Floatable>
          )}
        </div>
        <div
          ref={feedbackStack}
          className="pve:fixed pve:right-3 pve:bottom-3 pve:z-80 pve:max-w-[calc(100vw-24px)] pve:sm:right-5 pve:sm:bottom-4"
        >
          {(error ||
            (recovery.failure && !validationPath) ||
            serverPreview.error ||
            actionResult) &&
            expanded && (
              <div className="pve:pointer-events-auto pve:mb-2 pve:box-border pve:max-h-[min(50dvh,360px)] pve:overflow-auto pve:overscroll-contain pve:max-w-[min(520px,calc(100vw-24px))] pve:rounded-xl pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-elevation-0,#fff))] pve:p-3 pve:text-sm pve:leading-relaxed pve:shadow-lg">
                {error && (
                  <p role="alert" className="pve:m-0">
                    {error}
                    <ChromeButton size="sm" onClick={() => setError("")}>
                      Dismiss
                    </ChromeButton>
                  </p>
                )}
                {actionResult && (
                  <p role="status" className="pve:m-0">
                    {actionResult}
                    <ChromeButton size="sm" onClick={() => setActionResult("")}>
                      Dismiss
                    </ChromeButton>
                  </p>
                )}
                {serverPreview.error && (
                  <>
                    <p role="status" className="pve:m-0">
                      {serverPreview.error}
                    </p>
                    <ChromeButton size="sm" onClick={serverPreview.retry}>
                      {t(
                        "Refresh saved preview",
                        "Gespeicherte Vorschau aktualisieren",
                      )}
                    </ChromeButton>
                  </>
                )}
                {recovery.failure && !validationPath && (
                  <div role="alert">
                    <p className="pve:mt-0">{recovery.failure.message}</p>
                    <div className="pve:flex pve:flex-wrap pve:gap-2">
                      {recovery.failure.kind === "validation" &&
                        recovery.failure.paths?.map((path) => (
                          <ChromeButton
                            key={path}
                            size="sm"
                            variant="outline"
                            onClick={() => correctField(path)}
                          >
                            {t("Edit", "Bearbeiten:")} {validationLabel(path)}
                          </ChromeButton>
                        ))}
                      <ChromeButton
                        size="sm"
                        variant="outline"
                        onClick={downloadWorkingCopy}
                      >
                        {t(
                          "Download working copy",
                          "Arbeitskopie herunterladen",
                        )}
                      </ChromeButton>
                      {["network", "validation"].includes(
                        recovery.failure.kind,
                      ) ? (
                        <ChromeButton
                          size="sm"
                          variant="outline"
                          onClick={() => void retry()}
                        >
                          {t("Retry saving", "Erneut speichern")}
                        </ChromeButton>
                      ) : recovery.failure.kind === "session" ? (
                        <>
                          <ChromeButton
                            size="sm"
                            variant="outline"
                            disabled={reopening}
                            onClick={() => void reopenEditor()}
                          >
                            {reopening
                              ? t("Reopening…", "Wird geöffnet…")
                              : t("Reopen editor", "Editor erneut öffnen")}
                          </ChromeButton>
                          <a
                            href={`${config.routes.admin.replace(/\/$/, "")}/login?redirect=${encodeURIComponent(exitURL)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pve:inline-flex pve:min-h-9 pve:items-center pve:px-2 pve:text-inherit pve:underline pve:underline-offset-4 pve:focus-visible:outline-2 pve:focus-visible:outline-offset-2"
                          >
                            {t("Sign in (new tab)", "Anmelden (neuer Tab)")}
                          </a>
                        </>
                      ) : (
                        <ChromeButton
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (
                              window.confirm(
                                t(
                                  "Reload the latest draft? Unsaved changes will be discarded.",
                                  "Aktuellen Entwurf laden? Ungespeicherte Änderungen werden verworfen.",
                                ),
                              )
                            )
                              window.location.reload();
                          }}
                        >
                          {t("Reload latest draft", "Aktuellen Entwurf laden")}
                        </ChromeButton>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          <nav
            ref={dock}
            aria-label="Editing toolbar"
            className={`pve:pointer-events-auto pve:flex pve:max-w-full pve:items-center pve:gap-1 pve:box-border pve:rounded-2xl pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-elevation-0,#fff))] pve:p-1.5 pve:shadow-[0_4px_24px_#0000001a] pve:[interpolate-size:allow-keywords] pve:motion-safe:transition-[width] pve:motion-safe:duration-200 pve:motion-safe:ease-[cubic-bezier(0.2,0,0,1)] pve:max-sm:gap-0 ${expanded ? "pve:w-max" : "pve:w-auto"}`}
          >
            {!expanded ? (
              <ChromeButton
                ref={launcherButton}
                size="icon"
                variant="default"
                aria-label={t("Edit page", "Seite bearbeiten")}
                title={t("Edit page", "Seite bearbeiten")}
                aria-expanded={false}
                onClick={() => {
                  setExpanded(true);
                  setInspecting(editorTools.tools.includes("content"));
                  requestAnimationFrame(() =>
                    (
                      inspectButton.current ||
                      sectionsButton.current ||
                      toolsButton.current
                    )?.focus(),
                  );
                }}
              >
                <Pencil size={16} />
              </ChromeButton>
            ) : (
              <>
                {editorTools.tools.includes("content") && (
                  <ChromeButton
                    ref={inspectButton}
                    className="pve:max-sm:px-2"
                    aria-label={t("Edit content", "Inhalte bearbeiten")}
                    aria-pressed={inspecting && !outline && !hasPanel}
                    title={t("Edit content", "Inhalte bearbeiten")}
                    onClick={() => {
                      closeTools();
                      setOutline(false);
                      setSettingsOpen(false);
                      setInspecting(true);
                      setSelection(undefined);
                    }}
                  >
                    <MousePointer2
                      size={17}
                      className="pve:hidden pve:sm:block"
                    />
                    <span className="pve:sm:hidden">
                      {t("Edit", "Bearbeiten")}
                    </span>
                    <span className="pve:hidden pve:sm:inline">
                      {t("Edit content", "Inhalte bearbeiten")}
                    </span>
                  </ChromeButton>
                )}
                {editorTools.tools.includes("sections") && (
                  <ChromeButton
                    className="pve:max-sm:px-2"
                    ref={sectionsButton}
                    aria-label={t("Sections", "Abschnitte")}
                    aria-pressed={outline}
                    title={t("Sections", "Abschnitte")}
                    onClick={() => {
                      closeTools();
                      setSettingsOpen(false);
                      setOutline((v) => !v);
                    }}
                  >
                    <Layers size={17} className="pve:hidden pve:sm:block" />
                    <span>{t("Sections", "Abschnitte")}</span>
                  </ChromeButton>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    ref={toolsButton}
                    render={
                      <ChromeButton
                        size="icon"
                        className="pve:max-sm:size-9"
                        aria-label={t("More tools", "Weitere Werkzeuge")}
                        title={t("More tools", "Weitere Werkzeuge")}
                      />
                    }
                  >
                    <MoreHorizontal size={18} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {editorTools.tools.includes("content") && (
                      <DropdownMenuCheckboxItem
                        checked={highlighting}
                        onCheckedChange={setHighlighting}
                      >
                        <MousePointer2 size={16} />
                        {highlighting
                          ? t(
                              "Hide editable outlines",
                              "Hervorhebungen ausblenden",
                            )
                          : t(
                              "Highlight editable content",
                              "Bearbeitbare Inhalte hervorheben",
                            )}
                        {highlighting && <Check size={16} />}
                      </DropdownMenuCheckboxItem>
                    )}
                    {editorTools.extensions
                      .filter((e) => e.showInDock !== false)
                      .map((e) => (
                        <DropdownMenuItem
                          key={e.id}
                          onClick={() => {
                            setOutline(false);
                            setSettingsOpen(false);
                            if (e.kind === "panel") {
                              setCustomTool(null);
                              editorTools.openPanel(e.id);
                            } else {
                              closeTools();
                              setCustomTool(e.id);
                            }
                          }}
                        >
                          <PanelsTopLeft size={16} />
                          {e.label}
                        </DropdownMenuItem>
                      ))}
                    <DropdownMenuSeparator />
                    {editorTools.tools.includes("history") && (
                      <>
                        <DropdownMenuItem
                          disabled={disabled || !history.canUndo}
                          onClick={() => undo()}
                        >
                          <Undo2 size={16} />
                          Undo section change
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={disabled || !history.canRedo}
                          onClick={() => undo(true)}
                        >
                          <Redo2 size={16} />
                          Redo section change
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      disabled={disabled || !modified || background}
                      onClick={() => void saveDraft()}
                    >
                      <Check size={16} />
                      Save draft now
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="pve:sm:hidden"
                      onClick={minimize}
                    >
                      <Minus size={16} />
                      {t("Minimize editor", "Editor minimieren")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void exit()}>
                      <LogOut size={16} />
                      {t("Exit editing", "Bearbeiten beenden")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span
                  aria-hidden="true"
                  className="pve:mx-1 pve:h-5 pve:w-px pve:shrink-0 pve:bg-[var(--pve-border,var(--theme-border-color,#e3e4e8))]"
                />
                <span
                  role="status"
                  title={statusText}
                  className="pve:max-[360px]:sr-only pve:flex pve:items-center pve:gap-1.5 pve:px-1 pve:text-xs pve:whitespace-nowrap pve:text-[var(--pve-muted,var(--theme-elevation-700,#646773))]"
                >
                  <span
                    aria-hidden="true"
                    className="pve:inline-flex pve:items-center"
                  >
                    {recovery.failure ? (
                      <AlertTriangle size={14} />
                    ) : processing || background ? (
                      <CloudUpload size={14} />
                    ) : modified ? (
                      <Pencil size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                  </span>
                  <span className="pve:sr-only pve:md:not-sr-only pve:md:grid">
                    {[
                      t("Unsaved changes", "Ungespeicherte Änderungen"),
                      t("Confirming save…", "Speichern wird bestätigt…"),
                    ].map((value) => (
                      <span
                        key={value}
                        aria-hidden="true"
                        data-width-label={value}
                        className="pve:invisible pve:col-start-1 pve:row-start-1 pve:after:content-[attr(data-width-label)]"
                      />
                    ))}
                    <span className="pve:col-start-1 pve:row-start-1">
                      {statusText}
                    </span>
                  </span>
                </span>
                {editorTools.tools.includes("publish") &&
                  (info.data?._veRevision !== undefined ? (
                    <ReviewPublishButton compact frontend />
                  ) : (
                    <PublishButton />
                  ))}
                <ChromeButton
                  size="icon"
                  className="pve:max-sm:hidden!"
                  aria-label={t("Minimize editor", "Editor minimieren")}
                  title={t("Minimize editor", "Editor minimieren")}
                  onClick={minimize}
                >
                  <Minus size={16} />
                </ChromeButton>
              </>
            )}
          </nav>
          {inspecting && expanded && (
            <p className="pve:sr-only" role="status">
              {t(
                "Edit text on the page, or choose a section from Sections.",
                "Inhalt auf der Seite zum Bearbeiten wählen. Escape beendet die Auswahl.",
              )}
            </p>
          )}
          {serverPreview.pending && (
            <span role="status" className="pve:sr-only">
              {t(
                "Updating server preview…",
                "Server-Vorschau wird aktualisiert…",
              )}
            </span>
          )}
        </div>
        <div ref={setPortalContainer} data-ve-ui="" />
      </div>
    </ChromePortalProvider>
  );
}
