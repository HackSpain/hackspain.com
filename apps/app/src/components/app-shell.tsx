"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@convex/_generated/api";
import { SignOutButton } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/teams", label: "Team" },
  { href: "/perks", label: "Perks" },
  { href: "/tracks", label: "Tracks" },
  { href: "/profile", label: "Profile" },
] as const;

const ADMIN_NAV = [
  { href: "/admin", label: "CRM" },
  { href: "/admin/perks", label: "Perk admin" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/tracks", label: "Tracks" },
  { href: "/admin/notifications", label: "Notify" },
] as const;

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/users/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  active,
  variant,
  layout,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  variant: "user" | "admin";
  layout: "bar" | "sheet";
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "inline-flex items-center border-[3px] font-bungee uppercase touch-manipulation motion-safe:transition-[transform,background-color,border-color] motion-safe:duration-[var(--duration-press)] motion-safe:ease-[var(--ease-out)] motion-safe:active:scale-[0.97]",
        layout === "bar" && "min-h-11 px-3 py-1 text-xs",
        layout === "sheet" && "min-h-11 w-full px-3 text-sm",
        active
          ? variant === "admin"
            ? "border-hs-ink bg-hs-teal/40 text-hs-ink"
            : "border-hs-ink bg-hs-gold text-hs-ink"
          : "border-transparent text-hs-brown",
      )}
    >
      {label}
    </Link>
  );
}

function NavCluster({
  pathname,
  isAdmin,
  layout,
  onNavigate,
}: {
  pathname: string;
  isAdmin: boolean;
  layout: "bar" | "sheet";
  onNavigate?: () => void;
}) {
  return (
    <nav
      className={cn(
        layout === "bar" && "flex items-center gap-1",
        layout === "sheet" && "flex flex-col gap-1",
      )}
    >
      {NAV.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          variant="user"
          layout={layout}
          active={navActive(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}
      {isAdmin ? (
        <>
          {layout === "sheet" ? (
            <p className="mt-4 mb-1 font-bungee text-xs uppercase text-hs-navy">
              Admin
            </p>
          ) : null}
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              variant="admin"
              layout={layout}
              active={navActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </>
      ) : null}
    </nav>
  );
}

function MobileMenu({
  open,
  onClose,
  pathname,
  isAdmin,
  name,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  isAdmin: boolean;
  name?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      const frame = requestAnimationFrame(() => setVisible(false));
      return () => cancelAnimationFrame(frame);
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      setMounted(true);
      inner = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [visible, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        !visible && "pointer-events-none",
      )}
      inert={!visible}
      aria-hidden={!visible}
    >
      <div
        aria-hidden
        className="hs-sheet-backdrop absolute inset-0 bg-hs-ink/45"
        data-open={visible}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-open={visible}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && !visible) setMounted(false);
        }}
        className="hs-sheet-panel absolute inset-y-0 right-0 flex w-[min(20rem,100%)] flex-col border-l-[3px] border-hs-ink bg-hs-sand outline-none"
      >
        <div className="flex items-center justify-between border-b-[3px] border-hs-ink px-4 py-3">
          <p id={titleId} className="font-bungee text-base">
            Menu
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <NavCluster
            pathname={pathname}
            isAdmin={isAdmin}
            layout="sheet"
            onNavigate={onClose}
          />
        </div>
        <div className="space-y-3 border-t-[3px] border-hs-ink px-4 py-4">
          {name ? <p className="truncate text-sm text-hs-brown">{name}</p> : null}
          <SignOutButton className="w-full" />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const hideChrome =
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname === "/unregistered" ||
    pathname === "/pending";

  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const button = menuButtonRef.current;
    return () => {
      button?.focus();
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  if (hideChrome) {
    return <div className="min-h-screen bg-hs-paper">{children}</div>;
  }

  const isAdmin = me?.role === "admin";
  const displayName = me?.name ?? me?.email;

  return (
    <div className="min-h-screen bg-hs-paper">
      <div inert={menuOpen}>
        <header className="border-b-[3px] border-hs-ink bg-hs-sand">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center font-bungee text-lg text-hs-ink motion-safe:transition-transform motion-safe:duration-[var(--duration-press)] motion-safe:ease-[var(--ease-out)] motion-safe:active:scale-[0.97]"
            >
              HackSpain
            </Link>
            <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 lg:flex">
              <NavCluster pathname={pathname} isAdmin={isAdmin} layout="bar" />
              <div className="flex items-center gap-3">
                <span className="hidden max-w-40 truncate text-sm text-hs-brown xl:inline">
                  {displayName}
                </span>
                <SignOutButton />
              </div>
            </div>
            <Button
              ref={menuButtonRef}
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      </div>
      <MobileMenu
        open={menuOpen}
        onClose={closeMenu}
        pathname={pathname}
        isAdmin={isAdmin}
        name={displayName ?? undefined}
      />
    </div>
  );
}
