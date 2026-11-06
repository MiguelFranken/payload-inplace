"use client";

import dynamic from "next/dynamic";

/** Native admin styling stays in an async client boundary; the website imports the CSS-free review control. */
export const ReviewPublishButton = dynamic(
  () => import("./StyledReviewPublishButton.js"),
);
