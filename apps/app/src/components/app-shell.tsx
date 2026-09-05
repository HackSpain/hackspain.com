"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { ChevronRight, CircleUser } from "lucide-react";
import { Suspense } from "react";
import { api } from "@convex/_generated/api";
import { GithubLinkBanner, GithubLinkResult } from "@/components/github-link-banner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "CRM" },
  { href: "/admin/perks", label: "Perks" },
  { href: "/admin/applications", label: "Solicitudes" },
  { href: "/admin/tracks", label: "Retos" },
  { href: "/admin/notifications", label: "Avisos" },
] as const;

function adminNavActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/users/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AccountMenu({
  pathname,
  name,
  isAdmin,
}: {
  pathname: string;
  name?: string;
  isAdmin: boolean;
}) {
  const { signOut } = useAuthActions();
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");
  const adminActive = pathname.startsWith("/admin");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="data-open:bg-hs-sand"
          aria-label="Cuenta"
        >
          <CircleUser />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {name ? (
          <>
            <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            className={cn(
              "font-bungee uppercase",
              profileActive && "bg-hs-gold text-hs-ink",
            )}
          >
            Perfil
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link
              href="/admin"
              className={cn(
                "font-bungee uppercase",
                adminActive && "bg-hs-gold text-hs-ink",
              )}
            >
              Admin
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="font-bungee uppercase"
          onSelect={() => void signOut()}
        >
          Salir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AdminStrip({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Admin" className="border-b-[3px] border-hs-ink bg-hs-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4">
        {ADMIN_NAV.map((item) => {
          const active = adminNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex min-h-11 items-center font-bungee text-xs uppercase",
                active ? "text-hs-ink underline decoration-2 underline-offset-4" : "text-hs-brown",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const hideChrome =
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname === "/unregistered" ||
    pathname === "/pending";

  if (hideChrome) {
    return <div className="min-h-screen bg-hs-paper">{children}</div>;
  }

  const isAdmin = me?.role === "admin";
  const displayName = me?.name ?? me?.email;
  const askGithub =
    me !== undefined &&
    me !== null &&
    !me.githubLinked &&
    (isAdmin || (me.accepted && me.onboardingComplete));

  return (
    <div className="min-h-screen bg-hs-paper">
      <header className="border-b-[3px] border-hs-ink bg-hs-sand">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-self-start motion-safe:transition-transform motion-safe:duration-[var(--duration-press)] motion-safe:ease-[var(--ease-out)] motion-safe:active:scale-[0.97]"
          >
            <img
              src="/logo.svg"
              alt="HackSpain"
              width={125}
              height={40}
              className="h-auto w-20 sm:h-10 sm:w-auto"
            />
          </Link>
          <div className="flex items-center justify-center gap-3 sm:gap-5">
          <Link
            href="/insights"
            aria-current={pathname === "/insights" ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap text-hs-red underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hs-red sm:gap-2 sm:text-sm",
              pathname === "/insights" && "underline",
            )}
          >
            <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
            Insights en vivo
            <ChevronRight className="size-4 shrink-0" aria-hidden />
          </Link>
          <Link
            href="/feed"
            aria-current={pathname === "/feed" ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap text-hs-navy underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hs-navy sm:gap-2 sm:text-sm",
              pathname === "/feed" && "underline",
            )}
          >
            Feed
          </Link>
          </div>
          <div className="justify-self-end">
            <AccountMenu
              pathname={pathname}
              name={displayName ?? undefined}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      </header>
      {isAdmin && pathname.startsWith("/admin") ? (
        <AdminStrip pathname={pathname} />
      ) : null}
      {askGithub ? <GithubLinkBanner /> : null}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Suspense fallback={null}>
          <GithubLinkResult />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
