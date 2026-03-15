import type { ReactNode } from "react";

type Props = { children: ReactNode; title?: string };

export function ScannerLayout({ children, title }: Props) {
  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {title && (
        <header className="p-4 border-b">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </header>
      )}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
