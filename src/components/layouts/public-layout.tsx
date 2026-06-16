"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Search } from "lucide-react";
import { APP_NAME } from "@/lib/utils/constants";
import { PlazaTabBar } from "@/components/custom/plaza-tab-bar";

function PlazaNav() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/events?q=${encodeURIComponent(query)}` : "/events");
  }

  return (
    <>
      <div className="toprule" />
      <nav className="nav">
        <div className="wrap nav-in">
          <Link className="logo" href="/">
            <span className="m" />
            {APP_NAME}
          </Link>
          <div className="nav-links">
            <Link href="/events">Events</Link>
            <Link href="/venues">Venues</Link>
          </div>
          <div style={{ flex: 1 }} />
          <form className="nav-search-form" onSubmit={submit}>
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events…"
              aria-label="Search events"
            />
          </form>
          <div className="nav-cta">
            {isLoaded && isSignedIn ? (
              <Link className="btn btn-ink" href="/dashboard">
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  style={{
                    fontWeight: 700,
                    fontSize: 14.5,
                    color: "var(--ink-2)",
                  }}
                >
                  Sign in
                </Link>
                <Link className="btn btn-p" href="/sign-up">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

function PlazaFooter() {
  return (
    <footer className="foot wrap">
      <div className="foot-grid">
        <div>
          <div
            className="logo"
            style={{
              fontSize: 26,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span className="m" />
            {APP_NAME}
          </div>
          <p>
            Themeable ticketing for live events across the Philippines. Every
            event, its own world — one trustworthy checkout.
          </p>
        </div>
        <div className="col">
          <h4>Discover</h4>
          <Link href="/events">Events</Link>
          <Link href="/venues">Venues</Link>
        </div>
        <div className="col">
          <h4>For creators</h4>
          <Link href="/dashboard/events/create">Sell tickets</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/venues">List a venue</Link>
        </div>
        <div className="col">
          <h4>Account</h4>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Create account</Link>
          <Link href="/dashboard/tickets">My tickets</Link>
        </div>
      </div>
      <div className="foot-base">
        <span>
          © {new Date().getFullYear()} {APP_NAME} · Made in the Philippines 🇵🇭
        </span>
        <span className="mono">Signed QR tickets · Secure Stripe checkout</span>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="plaza flex min-h-screen flex-col">
      <PlazaNav />
      <main className="flex-1">{children}</main>
      <PlazaFooter />
      <PlazaTabBar />
    </div>
  );
}
