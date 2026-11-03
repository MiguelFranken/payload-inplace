"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical, Layers, Settings2, LockKeyhole } from "lucide-react";
import type { NativeSection } from "../schema/tree.js";
import { elementRect } from "../preview/geometry.js";
import { Button } from "./ui/button.js";
const key = (s: NativeSection) => JSON.stringify(s.identity);
export function sectionLabel(s: NativeSection) {
  return typeof s.block?.labels?.singular === "string"
    ? s.block.labels.singular
    : s.block?.slug || "Unavailable section";
}
/** Finds the renderer-owned binding without depending on a framework wrapper or transient array index. */
export function sectionElement(s: NativeSection) {
  return [
    ...document.querySelectorAll<HTMLElement>(
      "[data-ve-block]:not([data-ve-field])",
    ),
  ].find(
    (e) =>
      e.getAttribute("data-ve-root") === s.identity.root &&
      e.getAttribute("data-ve-block") === s.identity.blockId &&
      e.getAttribute("data-ve-ancestors") ===
        JSON.stringify(s.identity.ancestors || []),
  );
}
/** Both surfaces dispatch exactly one native identity-based move on drop. Drag state never changes document data. */
export function BlockReorder({
  sections,
  disabled,
  canvas = false,
  onMove,
  onPick,
  onSettings,
  lockedReason,
}: {
  sections: NativeSection[];
  disabled: boolean;
  canvas?: boolean;
  onMove: (from: NativeSection, to: NativeSection) => string | undefined;
  onPick: (s: NativeSection) => void;
  onSettings?: (s: NativeSection) => void;
  lockedReason?: (s: NativeSection) => string | undefined;
}) {
  const [active, setActive] = useState<string | null>(null),
    [over, setOver] = useState<string | null>(null),
    [message, setMessage] = useState("");
  const keyboardCoordinates: KeyboardCoordinateGetter = (
    event,
    { active, context },
  ) => {
    if (
      !["ArrowUp", "ArrowDown"].includes(event.code) ||
      !context.collisionRect
    )
      return;
    event.preventDefault();
    const parent = sections.find((s) => key(s) === active)?.parent;
    const siblings = sections.filter((s) => s.parent === parent);
    const current = siblings.findIndex(
      (s) => key(s) === (context.over?.id || active),
    );
    const next = siblings[current + (event.code === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    const rect = context.droppableRects.get(key(next));
    if (!rect || context.droppableContainers.get(key(next))?.disabled) return;
    // Center the overlay in variable-height real blocks; top-edge alignment can collide with the previous block.
    return {
      x: rect.left + (rect.width - context.collisionRect.width) / 2,
      y: rect.top + (rect.height - context.collisionRect.height) / 2,
    };
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      scrollBehavior: "auto",
    }),
  );
  const ids = useMemo(() => sections.map(key), [sections]);
  const collision: CollisionDetection = (args) => {
    const scoped = {
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => c.data.current?.parent === args.active.data.current?.parent,
      ),
    };
    return args.pointerCoordinates
      ? pointerWithin(scoped)
      : closestCenter(scoped);
  };
  function finish(e: DragEndEvent) {
    const from = sections.find((s) => key(s) === e.active.id),
      to = sections.find((s) => key(s) === e.over?.id);
    setActive(null);
    setOver(null);
    if (from && to && key(from) !== key(to)) {
      const error = onMove(from, to);
      setMessage(
        error || `${sectionLabel(from)} moved to position ${to.index + 1}.`,
      );
    }
  }
  const activeSection = sections.find((s) => key(s) === active);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={(e) => {
        setActive(String(e.active.id));
        setMessage("");
      }}
      onDragOver={(e) => setOver(e.over ? String(e.over.id) : null)}
      onDragCancel={() => {
        setActive(null);
        setOver(null);
        setMessage("Move cancelled.");
      }}
      onDragEnd={finish}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${sectionLabel(sections.find((s) => key(s) === active.id)!)}.`,
          onDragOver: ({ over }) =>
            over
              ? `Position ${sections.find((s) => key(s) === over.id)!.index + 1}.`
              : undefined,
          onDragEnd: () => "Section released.",
          onDragCancel: () => "Move cancelled.",
        },
        screenReaderInstructions: {
          draggable:
            "Press Space to pick up a section, arrow keys to move it, Space to drop, or Escape to cancel. Sections stay within their current block field.",
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {sections.map((s) => (
          <ReorderItem
            key={key(s)}
            section={s}
            disabled={disabled || s.readOnly}
            lock={lockedReason?.(s)}
            canvas={canvas}
            active={active}
            over={over}
            after={Boolean(activeSection && activeSection.index < s.index)}
            onPick={() => onPick(s)}
            onSettings={onSettings ? () => onSettings(s) : undefined}
          />
        ))}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeSection && (
          <div className="pve:pointer-events-none pve:flex pve:w-fit pve:items-center pve:gap-2 pve:rounded-lg pve:bg-[var(--pve-accent,#3451eb)] pve:px-3 pve:py-2 pve:text-sm pve:font-medium pve:text-white pve:shadow-lg">
            <GripVertical size={15} />
            {sectionLabel(activeSection)}
          </div>
        )}
      </DragOverlay>
      <span role="status" className="pve:sr-only">
        {message}
      </span>
    </DndContext>
  );
}
function ReorderItem({
  section: s,
  disabled,
  canvas,
  active,
  over,
  after,
  onPick,
  onSettings,
  lock,
}: {
  section: NativeSection;
  disabled: boolean;
  canvas: boolean;
  active: string | null;
  over: string | null;
  after: boolean;
  onPick: () => void;
  onSettings?: () => void;
  lock?: string;
}) {
  const id = key(s),
    {
      attributes,
      listeners,
      setNodeRef,
      setActivatorNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id,
      disabled: disabled || Boolean(lock),
      data: { parent: s.parent },
    });
  const overlay = useRef<HTMLDivElement>(null),
    [bound, setBound] = useState(false);
  useEffect(() => {
    if (!canvas) return;
    let frame = 0,
      element: HTMLElement | undefined;
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    function draw() {
      frame = 0;
      element = sectionElement(s);
      const rect = element && elementRect(element);
      setNodeRef(element || null);
      setBound(Boolean(rect));
      if (!rect || !overlay.current) return;
      for (const [name, value] of Object.entries({
        left: rect.left + 8,
        top: rect.top + 8,
        width: rect.width - 16,
        height: rect.height - 16,
      }))
        overlay.current.style.setProperty(`--pve-drag-${name}`, `${value}px`);
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    }
    const mutation = new MutationObserver(schedule);
    mutation.observe(
      document.querySelector("[data-ve-preview]") || document.body,
      { childList: true, subtree: true },
    );
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutation.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      setNodeRef(null);
    };
  }, [canvas, s.path, id, setNodeRef]);
  const label = sectionLabel(s);
  const handle = (
    <Button
      ref={setActivatorNodeRef}
      size="icon"
      disabled={disabled || Boolean(lock)}
      aria-label={`Move ${label} section`}
      title={lock || "Drag to move · Space for keyboard"}
      className="pve:touch-none pve:cursor-grab pve:active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {lock ? <LockKeyhole size={14} /> : <GripVertical size={16} />}
    </Button>
  );
  if (canvas)
    return (
      <div
        ref={overlay}
        hidden={!bound}
        data-ve-ui=""
        data-ve-canvas-handle={s.identity.blockId}
        data-ve-drag-over={over === id}
        className="pve:pointer-events-none pve:fixed pve:left-[var(--pve-drag-left)] pve:top-[var(--pve-drag-top)] pve:w-[var(--pve-drag-width)] pve:h-[var(--pve-drag-height)] pve:z-40"
      >
        <div
          className={`pve:pointer-events-auto pve:absolute pve:left-0 pve:top-0 pve:flex pve:items-center pve:gap-1 pve:rounded-lg pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-elevation-0,#fff))] pve:text-[var(--pve-text,var(--theme-text,#202127))] pve:shadow-sm ${isDragging ? "pve:opacity-40" : ""}`}
        >
          {handle}
          <Button size="sm" onClick={onPick}>
            {label}
            {lock && <span className="pve:sr-only"> · {lock}</span>}
          </Button>
        </div>
        {over === id && active !== id && (
          <div
            data-ve-drop-indicator=""
            aria-hidden="true"
            className={`pve:absolute pve:inset-x-0 pve:h-0.5 pve:bg-[var(--pve-accent,#3451eb)] ${after ? "pve:bottom-0" : "pve:top-0"}`}
          />
        )}
      </div>
    );
  return (
    <div
      ref={setNodeRef}
      data-ve-sortable={s.identity.blockId}
      data-ve-drag-over={over === id}
      data-ve-drop-target={over === id && active !== id}
      style={
        {
          "--pve-sort-x": `${transform?.x || 0}px`,
          "--pve-sort-y": `${transform?.y || 0}px`,
          "--pve-sort-transition": transition || "none",
        } as CSSProperties
      }
      className={`pve:flex pve:min-w-0 pve:items-center pve:gap-1 pve:rounded-xl pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-elevation-0,#fff))] pve:p-1 pve:translate-x-[var(--pve-sort-x)] pve:translate-y-[var(--pve-sort-y)] pve:motion-safe:[transition:var(--pve-sort-transition)] ${isDragging ? "pve:opacity-30" : ""}`}
    >
      {handle}
      <button
        type="button"
        onClick={onPick}
        title={typeof s.value.heading === "string" ? s.value.heading : label}
        className="pve:flex pve:min-h-10 pve:min-w-0 pve:flex-1 pve:items-center pve:gap-2.5 pve:rounded-lg pve:border-0 pve:bg-transparent pve:px-1 pve:text-left pve:font-inherit pve:text-inherit pve:cursor-pointer pve:outline-none pve:focus-visible:ring-2 pve:focus-visible:ring-[var(--pve-accent,#3451eb)]"
      >
        <Layers
          size={15}
          className="pve:shrink-0 pve:text-[var(--pve-muted,var(--theme-elevation-700,#646773))]"
        />
        <span className="pve:min-w-0">
          <span className="pve:block pve:truncate pve:text-sm pve:font-medium">
            {s.index + 1}.{" "}
            {typeof s.value.heading === "string" && s.value.heading
              ? s.value.heading
              : label}
          </span>
          <span
            className="pve:block pve:max-w-36 pve:truncate pve:text-xs pve:leading-5 pve:text-[var(--pve-muted,var(--theme-elevation-700,#646773))]"
            title={label}
          >
            {label}
            {lock ? " · Fixed first" : ""}
          </span>
        </span>
      </button>
      {onSettings && (
        <Button
          size="icon"
          aria-label={`Settings for ${label} section`}
          title="Section settings"
          onClick={onSettings}
        >
          <Settings2 size={16} />
        </Button>
      )}
    </div>
  );
}
