import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeading } from "@/components/shared";

export function MemberProfileView({
  profile,
  email,
  phone,
  own = false,
  preview = false,
}: {
  profile: { id: string; full_name: string; active: boolean };
  email: string | null;
  phone: string | null;
  own?: boolean;
  preview?: boolean;
}) {
  return (
    <>
      <PageHeading
        title={profile.full_name}
        description="Členský profil a kontakty dostupné podľa vašich oprávnení."
        action={
          <span className={`badge ${profile.active ? "success" : "danger"}`}>
            {profile.active ? "Aktívny člen" : "Neaktívny člen"}
          </span>
        }
      />
      <div className="member-profile-layout">
        <section className="profile-section" aria-labelledby="profile-contacts">
          <h2 id="profile-contacts">Kontaktné informácie</h2>
          <dl className="profile-facts">
            <div>
              <dt>E-mail</dt>
              <dd>
                {email ? (
                  <a className="text-link" href={`mailto:${email}`}>
                    {email}
                  </a>
                ) : (
                  "Neuvedený"
                )}
              </dd>
            </div>
            <div>
              <dt>Telefón</dt>
              <dd>
                {phone ? (
                  <a className="text-link" href={`tel:${phone}`}>
                    {phone}
                  </a>
                ) : (
                  "Neuvedený"
                )}
              </dd>
            </div>
          </dl>
          <p className="muted">
            Opravu členských údajov zabezpečuje správca klubu.
          </p>
        </section>
        <nav className="profile-section" aria-labelledby="profile-program">
          <h2 id="profile-program">Klubový program</h2>
          <Link
            className="profile-action"
            href={
              preview
                ? "/ukazka?view=kalendar"
                : `/klub/kalendar?child=${profile.id}`
            }
          >
            <span>
              <strong>Program člena</strong>
              <small>Najbližšie tréningy a zápasy</small>
            </span>
            <ArrowUpRight size={20} aria-hidden />
          </Link>
          <Link
            className="profile-action"
            href={
              preview
                ? "/ukazka?view=dochadzka"
                : `/klub/dochadzka?player=${profile.id}`
            }
          >
            <span>
              <strong>História účasti</strong>
              <small>Dochádzka zaznamenaná trénerom</small>
            </span>
            <ArrowUpRight size={20} aria-hidden />
          </Link>
          {own && (
            <Link className="text-link mt-4" href="/klub/profil">
              Upraviť vlastné kontakty
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
