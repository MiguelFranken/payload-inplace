import type { Preview } from "@storybook/react-vite";
import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./preview.css?inline";
import { EditorMessagesProvider } from "@payload-inplace/ui/localization/EditorMessages";
import { ChromePortalProvider } from "@payload-inplace/ui/primitives/portal/portal";

function EditorPreview({
  children,
  locale,
}: {
  children: ReactNode;
  locale: string;
}) {
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const mount = useCallback((node: HTMLDivElement | null) => {
    if (node) setShadow(node.shadowRoot ?? node.attachShadow({ mode: "open" }));
  }, []);
  return (
    <div ref={mount}>
      {shadow &&
        createPortal(
          <>
            <style>{styles}</style>
            <EditorMessagesProvider
              options={{ locale, direction: locale === "ar" ? "rtl" : "ltr" }}
            >
              <div className="pve:box-border pve:min-h-64 pve:bg-[var(--pve-surface,#fff)] pve:p-4 pve:font-sans pve:text-sm pve:text-[var(--pve-text,#202127)]">
                <ChromePortalProvider container={container}>
                  {children}
                </ChromePortalProvider>
                <div ref={setContainer} data-ve-ui="" />
              </div>
            </EditorMessagesProvider>
          </>,
          shadow,
        )}
    </div>
  );
}

export default {
  globalTypes: {
    locale: {
      description: "Editor language and direction",
      toolbar: { items: ["en", "de", "ar"] },
    },
  },
  initialGlobals: { locale: "en" },
  decorators: [
    (Story, context) => (
      <EditorPreview locale={context.globals.locale}>
        <Story />
      </EditorPreview>
    ),
  ],
} satisfies Preview;
