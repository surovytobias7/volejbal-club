import { Volleyball } from "lucide-react";
import type { ReactNode } from "react";
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <section className="auth-art">
        <div className="brand">
          <span className="brand-symbol">
            <Volleyball size={28} />
          </span>
          <span>
            Volej klub<small>Klubový priestor</small>
          </span>
        </div>
        <div className="court" aria-hidden />
        <div>
          <h1>Silný tím začína spolu.</h1>
          <p>
            Tréningy, zápasy a všetko medzi nimi. Váš klub má konečne spoločný
            priestor.
          </p>
        </div>
        <small>Spolu na ihrisku aj mimo neho.</small>
      </section>
      <main className="auth-form-area">
        <div className="auth-form-card">{children}</div>
      </main>
    </div>
  );
}
