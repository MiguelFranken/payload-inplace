import type { Preview } from "@storybook/react-vite";
import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./preview.css?inline";
import { EditorMessagesProvider } from "@payload-inplace/ui/localization/EditorMessages";
import { ChromePortalProvider } from "@payload-inplace/ui/primitives/portal/portal";

function EditorPreview({
  children,
  locale,
  theme,
}: {
  children: ReactNode;
  locale: string;
  theme: "light" | "dark";
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
              <div
                data-theme={theme}
                className="pve:box-border pve:min-h-64 pve:bg-[var(--pve-surface)] pve:p-4 pve:font-sans pve:text-sm pve:text-[var(--pve-text)] pve:[--pve-surface:#fff] pve:[--pve-text:#202127] pve:[--pve-border:#e3e4e8] pve:[--pve-muted:#646773] pve:[--pve-hover:#f1f2f5] pve:data-[theme=dark]:[--pve-surface:#18191d] pve:data-[theme=dark]:[--pve-text:#f0f0f2] pve:data-[theme=dark]:[--pve-border:#454751] pve:data-[theme=dark]:[--pve-muted:#b9bbc4] pve:data-[theme=dark]:[--pve-hover:#30313a]"
              >
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
    theme: {
      description: "Editor theme",
      toolbar: { items: ["light", "dark"] },
    },
    locale: {
      description: "Editor language and direction",
      toolbar: { items: ["en", "de", "ar"] },
    },
  },
  initialGlobals: { locale: "en", theme: "light" },
  decorators: [
    (Story, context) => (
      <EditorPreview
        locale={context.globals.locale}
        theme={context.globals.theme}
      >
        <Story />
      </EditorPreview>
    ),
  ],
} satisfies Preview;
