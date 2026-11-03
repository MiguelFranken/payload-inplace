"use client";
import dynamic from "next/dynamic";
/** Version-page CSS is requested only when the native restore view renders. */
export const GuardedRestore = dynamic(
  () => import("./StyledGuardedRestore.js"),
);
