export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background px-6 py-4">
        <nav className="mx-auto max-w-7xl">
          <span className="text-xl font-bold">PHLive</span>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {children}
      </main>
      <footer className="border-t bg-background px-6 py-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} PHLive. All rights reserved.
      </footer>
    </div>
  );
}
