"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import type { InsertionProjection } from "@payload-inplace/core/projection";

/** Only a disposable insertion delta is stored here. Native values/history/dirty state are never changed by preview. */
const TransientContext = createContext<{
  capable: boolean;
  projection?: InsertionProjection;
  preview: (projection?: InsertionProjection) => void;
}>({ capable: false, preview: () => {} });

export function TransientPreviewProvider({
  capable,
  children,
}: {
  capable: boolean;
  children: ReactNode;
}) {
  const [projection, preview] = useState<InsertionProjection>();
  return (
    <TransientContext
      value={useMemo(
        () => ({ capable, projection, preview }),
        [capable, projection],
      )}
    >
      {children}
    </TransientContext>
  );
}

export function useTransientPreview() {
  return use(TransientContext);
}
