"use client";
import { useEditorPreviewData } from "@miguel.franken/payload-visual-editor/frontend";
import { StoryView } from "./StoryView";
export function LiveStory({ document }: { document: any }) {
  return <StoryView document={useEditorPreviewData(document)} active />;
}
