"use client";
import {
  Component,
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useField, useForm } from "@payloadcms/ui";
import type { ClientField, FieldState } from "payload";
export type ContextualFieldKind =
  | "text"
  | "textarea"
  | "number"
  | "checkbox"
  | "date"
  | "select"
  | "upload"
  | "relationship";
type FieldOf<K extends ContextualFieldKind> = Extract<ClientField, { type: K }>;
export type ContextualFieldValue<K extends ContextualFieldKind> =
  K extends "number"
    ? number | null
    : K extends "checkbox"
      ? boolean
      : K extends "upload" | "relationship"
        ? unknown
        : K extends "select"
          ? string | string[] | null
          : string | null;
/** Values and validation belong to useField; strategy components never receive a document snapshot or save callback. */
export interface ContextualFieldProps<K extends ContextualFieldKind> {
  field: FieldOf<K>;
  path: string;
  schemaPath: string;
  disabled: boolean;
  value: ContextualFieldValue<K> | undefined;
  setValue: (value: ContextualFieldValue<K>) => void;
  error?: string;
  openNative: () => void;
}
export interface StrategyMatch {
  field: ClientField;
  path: string;
  schemaPath: string;
  blockType?: string;
}
/** Client-only registration. An explicit panel annotation, native custom Field, denied or conditioned field always retains native authority. */
export interface FieldStrategyDefinition<
  K extends ContextualFieldKind = ContextualFieldKind,
> {
  id: string;
  types: readonly K[];
  priority?: number;
  match?: (context: StrategyMatch) => boolean;
  /** Native mode disables a contextual/inline strategy for matching fields without replacing native UI. */
  mode?: "contextual" | "native";
  Component?: ComponentType<ContextualFieldProps<K>>;
}
/** Retain the field-kind generic when defining a consumer component. No React/editor runtime is created here. */
export function defineFieldStrategy<K extends ContextualFieldKind>(
  definition: FieldStrategyDefinition<K>,
): FieldStrategyDefinition<K> {
  return definition;
}
type Entry = FieldStrategyDefinition;
const Registry = createContext<{
  entries: Entry[];
  register: (entry: Entry) => () => void;
}>({ entries: [], register: () => () => {} });
/** Registry lives inside one native document Form. It is never shared globally across sites/documents. */
export function FieldStrategiesProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const register = useCallback((entry: Entry) => {
    if (
      !/^[a-z][a-z0-9-]{0,63}$/.test(entry.id) ||
      !entry.types.length ||
      (entry.mode !== "native" && !entry.Component)
    )
      throw new Error(
        "A field strategy needs an ID, field types and a component or native mode",
      );
    setEntries((current) => {
      if (current.some((value) => value.id === entry.id))
        throw new Error(`Duplicate field strategy: ${entry.id}`);
      return [...current, entry].sort(
        (a, b) =>
          (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id),
      );
    });
    return () =>
      setEntries((current) => current.filter((value) => value !== entry));
  }, []);
  return (
    <Registry
      value={useMemo(() => ({ entries, register }), [entries, register])}
    >
      {children}
    </Registry>
  );
}
/** Install a stable, module-level definition from a configured strategy provider. Unmounting releases it. */
export function EditorFieldStrategy<K extends ContextualFieldKind>({
  definition,
}: {
  definition: FieldStrategyDefinition<K>;
}) {
  const { register } = use(Registry);
  useEffect(
    () => register(definition as unknown as Entry),
    [register, definition],
  );
  return null;
}
/** A failing consumer predicate cannot stop editing. Native fallback remains available. */
export function useFieldStrategy(
  context: StrategyMatch | undefined,
  state: FieldState | undefined,
  permitted: boolean,
) {
  const { entries } = use(Registry);
  if (
    !context ||
    !state ||
    !permitted ||
    state.passesCondition === false ||
    state.customComponents?.Field ||
    context.field.admin?.readOnly
  )
    return;
  return entries.find((entry) => {
    if (!entry.types.includes(context.field.type as ContextualFieldKind))
      return false;
    try {
      return !entry.match || entry.match(context);
    } catch {
      return false;
    }
  });
}
class StrategyBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
/** Already inside NativeFieldsOwner. Native UI replaces a failed/unsupported strategy without mounting a second field owner. */
export function ContextualFieldEditor<K extends ContextualFieldKind>({
  definition,
  context,
  disabled,
  fallback,
}: {
  definition: FieldStrategyDefinition<K>;
  context: StrategyMatch;
  disabled: boolean;
  fallback: ReactNode;
}) {
  const [native, setNative] = useState(false);
  if (native || definition.mode === "native" || !definition.Component)
    return fallback;
  return (
    <StrategyBoundary
      key={`${definition.id}:${context.path}`}
      fallback={fallback}
    >
      <StrategyControl
        definition={definition}
        context={context}
        disabled={disabled}
        openNative={() => setNative(true)}
      />
    </StrategyBoundary>
  );
}
function StrategyControl<K extends ContextualFieldKind>({
  definition,
  context,
  disabled,
  openNative,
}: {
  definition: FieldStrategyDefinition<K>;
  context: StrategyMatch;
  disabled: boolean;
  openNative: () => void;
}) {
  const field = useField({ path: context.path }),
    form = useForm();
  const Control = definition.Component!;
  return (
    <Control
      field={context.field as FieldOf<K>}
      path={context.path}
      schemaPath={context.schemaPath}
      disabled={disabled || field.disabled}
      value={field.value as ContextualFieldValue<K>}
      setValue={(value) => {
        if (
          !disabled &&
          !field.disabled &&
          form.getField(context.path)?.passesCondition !== false
        )
          field.setValue(value);
      }}
      error={field.errorMessage}
      openNative={openNative}
    />
  );
}
