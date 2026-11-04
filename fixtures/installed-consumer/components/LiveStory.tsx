"use client";
import { useEditorPreviewData } from "payload-inplace/frontend";
import { StoryView } from "./StoryView";
export function LiveStory({ document }: { document: any }) {
  return <StoryView document={useEditorPreviewData(document)} active />;
}
