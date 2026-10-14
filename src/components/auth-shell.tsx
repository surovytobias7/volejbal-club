import { Volleyball } from "lucide-react";
import type { ReactNode } from "react";
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <section className="auth-art">
        <div className="brand">
          <span className="brand-symbol">
            <Volleyball size={28} aria-hidden />
          </span>
          <span>
            Volej klub<small>Klubový priestor</small>
          </span>
        </div>
        <div>
          <h2 className="auth-headline">Každý tréning. Jeden tím.</h2>
          <p>
            Tréningy, zápasy a všetko medzi nimi. Váš klub má konečne spoločný
            priestor.
          </p>
        </div>
        <svg
          className="auth-court"
          viewBox="0 0 360 210"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M20 20h320v170H20z M180 20v170 M126 20v170 M234 20v170"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M180 8v194"
            stroke="white"
            strokeWidth="3"
            strokeDasharray="4 5"
          />
          <g fill="currentColor">
            <circle cx="60" cy="55" r="7" />
            <circle cx="60" cy="105" r="7" />
            <circle cx="60" cy="155" r="7" />
            <circle cx="148" cy="55" r="7" />
            <circle cx="148" cy="105" r="7" />
            <circle cx="148" cy="155" r="7" />
          </g>
          <g stroke="white" strokeWidth="2">
            <circle cx="212" cy="55" r="7" />
            <circle cx="212" cy="105" r="7" />
            <circle cx="212" cy="155" r="7" />
            <circle cx="300" cy="55" r="7" />
            <circle cx="300" cy="105" r="7" />
            <circle cx="300" cy="155" r="7" />
          </g>
        </svg>
        <small>Spolu na ihrisku aj mimo neho.</small>
      </section>
      <main className="auth-form-area">
        <div className="auth-form-card">{children}</div>
      </main>
    </div>
  );
}
