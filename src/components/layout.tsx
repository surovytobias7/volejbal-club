"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  CalendarDays,
  Users,
  Volleyball,
  LayoutDashboard,
  Megaphone,
  CreditCard,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  UserRound,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Role } from "@/lib/auth";
import { logout } from "@/features/auth/actions";

const links = [
  { href: "/klub", label: "Prehľad", icon: LayoutDashboard },
  { href: "/klub/kalendar", label: "Kalendár", icon: CalendarDays },
  { href: "/klub/timy", label: "Tímy", icon: Volleyball },
  { href: "/klub/clenovia", label: "Členovia", icon: Users, admin: false },
  { href: "/klub/dochadzka", label: "Dochádzka", icon: Activity },
  { href: "/klub/oznamy", label: "Oznamy", icon: Megaphone },
  {
    href: "/klub/platby",
    label: "Členské a platby",
    icon: CreditCard,
    finance: true,
  },
];
const adminLinks = [
  { href: "/klub/nastavenia", label: "Nastavenia klubu", icon: Settings },
  { href: "/klub/audit", label: "História zmien", icon: ShieldCheck },
];
const sectionLabels = [
  { href: "/klub/platby/plany", label: "Plány členského" },
  ...links,
  ...adminLinks,
  { href: "/klub/profil", label: "Môj profil" },
  { href: "/klub/notifikacie", label: "Upozornenia" },
];
export function Shell({
  children,
  name,
  club,
  logo,
  roles,
  preview = false,
  finance = true,
  previewView = "klub",
}: {
  children: ReactNode;
  name: string;
  club: string;
  logo?: string | null;
  roles: Role[];
  preview?: boolean;
  finance?: boolean;
  previewView?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const openNavigation = (button: HTMLButtonElement) => {
    trigger.current = button;
    setOpen(true);
  };
  const admin = roles.includes("admin");
  const names: Record<Role, string> = {
    admin: "Administrátor",
    coach: "Tréner",
    guardian: "Rodič",
    player: "Hráč",
  };
  const sidebarContent = (
    <>
      <Link
        href={preview ? "/ukazka" : "/klub"}
        className="brand"
        onClick={() => setOpen(false)}
      >
        {logo ? (
          <Image
            src={logo}
            width={42}
            height={42}
            alt=""
            unoptimized
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="brand-symbol">
            <Volleyball size={27} strokeWidth={1.8} aria-hidden />
          </span>
        )}
        <span>
          {club}
          <small>Klubový priestor</small>
        </span>
      </Link>
      <div className="club-season">
        <span className="season-dot" /> Sezóna {new Date().getFullYear()} /{" "}
        {new Date().getFullYear() + 1}
      </div>
      <nav aria-label="Hlavná navigácia">
        {links
          .filter((l) => (!l.admin || admin) && (!l.finance || finance))
          .map((link) => {
            const active = preview
              ? link.href.split("/").pop() === previewView ||
                (link.href === "/klub" &&
                  ["rodic", "trener", "hrac"].includes(previewView))
              : link.href === "/klub"
                ? pathname === link.href
                : pathname.startsWith(link.href);
            return (
              <Link
                onClick={() => setOpen(false)}
                key={link.href}
                href={
                  preview
                    ? `/ukazka?view=${link.href.split("/").pop()}`
                    : link.href
                }
                className={`nav-link ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <link.icon size={19} aria-hidden />
                {link.label}
              </Link>
            );
          })}
      </nav>
      <div className="sidebar-bottom">
        {admin &&
          !preview &&
          adminLinks.map((link) => (
            <Link
              key={link.href}
              className={`nav-link ${pathname === link.href ? "active" : ""}`}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <link.icon size={19} aria-hidden />
              {link.label}
            </Link>
          ))}
        <div className="sidebar-profile">
          <span className="avatar">
            {name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span>
            <strong>{name}</strong>
            <small>{roles.map((r) => names[r]).join(", ")}</small>
          </span>
        </div>
      </div>
    </>
  );
  const section = preview
    ? sectionLabels.find((item) => item.href.split("/").pop() === previewView)
        ?.label || "Prehľad"
    : sectionLabels.find(
        (item) =>
          item.href !== "/klub" &&
          (pathname === item.href || pathname.startsWith(item.href + "/")),
      )?.label || "Prehľad";
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div className="app-shell">
        <a className="skip-link" href="#main">
          Preskočiť na obsah
        </a>
        <aside
          className="sidebar sidebar-desktop"
          aria-label="Klubová navigácia"
        >
          {sidebarContent}
        </aside>
        <Dialog.Portal>
          <Dialog.Overlay className="nav-scrim" />
          <Dialog.Content
            asChild
            aria-modal="true"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (trigger.current?.getClientRects().length)
                trigger.current.focus();
            }}
          >
            <aside className="sidebar sidebar-mobile">
              <Dialog.Title className="sr-only">Klubová navigácia</Dialog.Title>
              <Dialog.Description className="sr-only">
                Vyberte časť klubového priestoru.
              </Dialog.Description>
              <Dialog.Close
                className="icon-button mobile-close"
                aria-label="Zavrieť navigáciu"
              >
                <X size={20} aria-hidden />
              </Dialog.Close>
              {sidebarContent}
            </aside>
          </Dialog.Content>
        </Dialog.Portal>
        <div className="workspace">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              aria-label="Otvoriť navigáciu"
              aria-expanded={open}
              onClick={(event) => openNavigation(event.currentTarget)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">{section}</span>
            <div className="topbar-actions">
              <span className="today-label">
                {new Intl.DateTimeFormat("sk-SK", {
                  day: "numeric",
                  month: "long",
                  timeZone: "Europe/Bratislava",
                }).format(new Date())}
              </span>
              {!preview && (
                <>
                  <Link
                    className="icon-button"
                    href="/klub/notifikacie"
                    aria-label="Upozornenia"
                  >
                    <Bell size={20} />
                  </Link>
                  <Link
                    className="icon-button"
                    href="/klub/profil"
                    aria-label="Môj profil"
                  >
                    <UserRound size={20} />
                  </Link>
                  <form action={logout}>
                    <button className="icon-button" aria-label="Odhlásiť sa">
                      <LogOut size={19} />
                    </button>
                  </form>
                </>
              )}
            </div>
          </header>
          <main id="main" className="main-content" tabIndex={-1}>
            {children}
          </main>
          <nav className="mobile-dock" aria-label="Rýchla navigácia">
            <Link
              href={preview ? "/ukazka" : "/klub"}
              aria-current={
                (
                  preview
                    ? ["klub", "rodic", "trener", "hrac"].includes(previewView)
                    : pathname === "/klub"
                )
                  ? "page"
                  : undefined
              }
            >
              <LayoutDashboard size={20} aria-hidden />
              Prehľad
            </Link>
            <Link
              href={preview ? "/ukazka?view=kalendar" : "/klub/kalendar"}
              aria-current={
                (
                  preview
                    ? previewView === "kalendar"
                    : pathname.startsWith("/klub/kalendar")
                )
                  ? "page"
                  : undefined
              }
            >
              <CalendarDays size={20} aria-hidden />
              Program
            </Link>
            <Link
              href={preview ? "/ukazka?view=oznamy" : "/klub/oznamy"}
              aria-current={
                (
                  preview
                    ? previewView === "oznamy"
                    : pathname.startsWith("/klub/oznamy")
                )
                  ? "page"
                  : undefined
              }
            >
              <Megaphone size={20} aria-hidden />
              Oznamy
            </Link>
            <button
              type="button"
              onClick={(event) => openNavigation(event.currentTarget)}
              aria-expanded={open}
              aria-label="Otvoriť navigáciu"
            >
              <Menu size={20} aria-hidden />
              Menu
            </button>
          </nav>
          <footer className="app-footer">
            <span>{club}</span>
            <span>Spolu na ihrisku aj mimo neho.</span>
          </footer>
        </div>
      </div>
    </Dialog.Root>
  );
}
