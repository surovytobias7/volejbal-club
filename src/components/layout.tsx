"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
export function Shell({
  children,
  name,
  club,
  logo,
  roles,
  preview = false,
  finance = true,
}: {
  children: ReactNode;
  name: string;
  club: string;
  logo?: string | null;
  roles: Role[];
  preview?: boolean;
  finance?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>("a,button") || [],
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [open]);
  const admin = roles.includes("admin");
  const names: Record<Role, string> = {
    admin: "Administrátor",
    coach: "Tréner",
    guardian: "Rodič",
    player: "Hráč",
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Preskočiť na obsah
      </a>
      {open && (
        <button
          className="nav-scrim"
          aria-label="Zavrieť navigáciu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        className={`sidebar ${open ? "is-open" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Klubová navigácia"
      >
        <Link href={preview ? "/ukazka" : "/klub"} className="brand">
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
              <Volleyball size={27} strokeWidth={1.8} />
            </span>
          )}
          <span>
            {club}
            <small>Klubový priestor</small>
          </span>
        </Link>
        <button
          className="icon-button mobile-close"
          aria-label="Zavrieť navigáciu"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <div className="club-season">
          <span className="season-dot" /> Sezóna {new Date().getFullYear()} /{" "}
          {new Date().getFullYear() + 1}
        </div>
        <nav aria-label="Hlavná navigácia">
          {links
            .filter((l) => (!l.admin || admin) && (!l.finance || finance))
            .map((link) => {
              const active = preview
                ? link.href === "/klub"
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
          <div className="club-note">
            <Volleyball size={26} />
            <strong>Jeden klub. Jeden tím.</strong>
            <p>Všetko dôležité, na jednom mieste.</p>
          </div>
          {admin && !preview && (
            <Link className="nav-link" href="/klub/nastavenia">
              <Settings size={19} />
              Nastavenia klubu
            </Link>
          )}
          {admin && !preview && (
            <Link className="nav-link" href="/klub/audit">
              <ShieldCheck size={19} />
              História zmien
            </Link>
          )}
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
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Otvoriť navigáciu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <span className="breadcrumb">
            Klubový priestor <span>/</span>{" "}
            {preview
              ? "Ukážka rozhrania"
              : links.find(
                  (l) => l.href !== "/klub" && pathname.startsWith(l.href),
                )?.label || "Prehľad"}
          </span>
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
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>{club}</span>
          <span>Spolu na ihrisku aj mimo neho.</span>
        </footer>
      </div>
    </div>
  );
}
