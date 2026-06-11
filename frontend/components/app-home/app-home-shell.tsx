"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { GleamLogo } from "@/components/brand/gleam-logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/network", label: "Network" },
  { href: "/workflows/ecommerce-launch", label: "Goal Demo" },
  { href: "/connect", label: "Connect Agent" },
  { href: "/onboarding", label: "Register Provider" },
  { href: "/", label: "Console" },
] as const;

export function AppHomeShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-clozr-bg text-clozr-primary",
        className
      )}
    >
      <header className="sticky top-0 z-20 border-b border-clozr-border bg-clozr-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-6 px-5 sm:px-8">
          <Link
            href="/app"
            aria-label="Gleam home"
            className="flex items-center transition-opacity hover:opacity-80"
          >
            <GleamLogo height={26} priority />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-2.5 py-1.5 text-[13px] transition-colors rounded-md",
                    active
                      ? "text-clozr-primary font-medium"
                      : "text-clozr-secondary hover:text-clozr-primary"
                  )}
                >
                  {item.label}
                  {active ? (
                    <span className="absolute bottom-0 left-2.5 right-2.5 h-0.5 rounded-full bg-clozr-coral" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-clozr-border py-8">
        <p className="text-center text-xs text-clozr-muted tracking-wide">
          Agent coordination infrastructure
        </p>
      </footer>
    </div>
  );
}
