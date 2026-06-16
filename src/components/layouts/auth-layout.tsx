import Link from "next/link";
import { APP_NAME } from "@/lib/utils/constants";

const BUNTING_COLORS = ["#EA5A3D", "#FFC53D", "#0E8A6E", "#118AB2"];

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="plaza flex min-h-screen flex-col">
      <div className="toprule" />
      <header className="nav">
        <div className="wrap nav-in">
          <Link className="logo" href="/">
            <span className="m" />
            {APP_NAME}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        <div className="mb-8 text-center">
          <div className="eyebrow">Welcome to the scene</div>
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              marginTop: 8,
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 800,
              letterSpacing: "-0.025em",
            }}
          >
            Sign in to {APP_NAME}
          </h1>
        </div>
        {children}
      </main>

      <div className="bunting" style={{ marginTop: 0 }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <i key={i} style={{ background: BUNTING_COLORS[i % 4] }} />
        ))}
      </div>
    </div>
  );
}
