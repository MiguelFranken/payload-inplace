import "../../styles.css";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="demo:m-0 demo:bg-canvas demo:font-sans demo:text-ink">
        {children}
      </body>
    </html>
  );
}
