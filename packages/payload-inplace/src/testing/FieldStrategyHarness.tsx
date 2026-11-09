"use client";

import { useState, type ReactNode } from "react";
import type {
  ContextualFieldKind,
  ContextualFieldProps,
  ContextualFieldValue,
  FieldStrategyDefinition,
} from "../frontend/field-strategies";

/** Unit-only control harness. Exercises a consumer Component's value/disabled/error/native-handoff UI without pretending to be Payload Form or a save/access backend. Verify registration, ACL and conditions separately in native integration. */
export function FieldStrategyHarness<K extends ContextualFieldKind>({
  definition,
  initialValue,
  field,
  path = "layout.0.value",
  schemaPath = "testPages.layout.testSection.value",
  disabled = false,
  error,
  onChange,
  onNative,
  fallback = null,
}: {
  definition: FieldStrategyDefinition<K>;
  initialValue?: ContextualFieldValue<K>;
  field: ContextualFieldProps<K>["field"];
  path?: string;
  schemaPath?: string;
  disabled?: boolean;
  error?: string;
  onChange?: (value: ContextualFieldValue<K>) => void;
  onNative?: () => void;
  fallback?: ReactNode;
}) {
  const [value, setValue] = useState(initialValue),
    [native, setNative] = useState(false);
  const Control = definition.Component;
  if (native || !Control || definition.mode === "native") return fallback;
  return (
    <Control
      field={field}
      path={path}
      schemaPath={schemaPath}
      value={value}
      disabled={disabled}
      error={error}
      setValue={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      openNative={() => {
        setNative(true);
        onNative?.();
      }}
    />
  );
}
