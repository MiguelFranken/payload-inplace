"use client";

import { createContext } from "react";

/** Read-only authorized draft at editor activation. It survives dock minimization and never owns Form values or persistence. */
export const ReviewBaselineContext = createContext<
  Record<string, any> | undefined
>(undefined);
