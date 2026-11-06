import "../../site.generated.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="site:m-0 site:bg-stone-50 site:font-sans site:text-stone-950">
        {children}
      </body>
    </html>
  );
}
