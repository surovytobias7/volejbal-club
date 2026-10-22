import type { ReactNode } from "react";
import { ClubIdentity } from "@/components/club-identity";
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <section className="auth-art">
        <div className="auth-identity">
          <ClubIdentity />
        </div>
        <div className="auth-story">
          <h2 className="auth-headline">
            Spolu na ihrisku.
            <br />
            Aj mimo neho.
          </h2>
          <p>
            Tréningy, zápasy a klubový život. Spoločný priestor pre hráčov,
            rodičov, trénerov a vedenie klubu.
          </p>
          <div className="auth-signature" aria-hidden="true" />
        </div>
        <small className="auth-club-caption">
          Školský športový klub · Bratislava
        </small>
      </section>
      <main className="auth-form-area">
        <div className="auth-form-card">{children}</div>
      </main>
    </div>
  );
}
