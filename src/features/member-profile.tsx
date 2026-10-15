import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { PageHeading, Panel } from "@/components/shared";
export async function MemberProfile({ id }: { id: string }) {
  const v = await requireViewer();
  const [profile, details] = await Promise.all([
    v.db
      .from("profiles")
      .select("id,full_name,active")
      .eq("id", id)
      .maybeSingle(),
    v.db
      .from("member_details")
      .select("email,phone")
      .eq("profile_id", id)
      .maybeSingle(),
  ]);
  if (profile.error || details.error)
    throw new Error("Profil sa nepodarilo načítať.");
  if (!profile.data) notFound();
  return (
    <>
      <div className="profile-heading">
        <span className="profile-avatar" aria-hidden>
          {profile.data.full_name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </span>
        <PageHeading
          title={profile.data.full_name}
          description="Členský profil a kontakty dostupné podľa vašich oprávnení."
        />
      </div>
      <div className="two-columns">
        <Panel title="Kontaktné informácie">
          <div className="panel-body">
            <div className="metric-line">
              <span>Stav profilu</span>
              <span
                className={`badge ${profile.data.active ? "success" : "danger"}`}
              >
                {profile.data.active ? "Aktívny" : "Neaktívny"}
              </span>
            </div>
            <div className="metric-line">
              <span>E-mail</span>
              {details.data?.email ? (
                <a className="text-link" href={`mailto:${details.data.email}`}>
                  {details.data.email}
                </a>
              ) : (
                <span>Neuvedený</span>
              )}
            </div>
            <div className="metric-line">
              <span>Telefón</span>
              {details.data?.phone ? (
                <a className="text-link" href={`tel:${details.data.phone}`}>
                  {details.data.phone}
                </a>
              ) : (
                <span>Neuvedený</span>
              )}
            </div>
            <p className="muted mt-4">
              Opravu členských údajov zabezpečuje správca klubu.
            </p>
          </div>
        </Panel>
        <Panel title="Klubový program">
          <div className="panel-body stack">
            <Link className="text-link" href={`/klub/kalendar?child=${id}`}>
              Zobraziť program člena
            </Link>
            <Link className="text-link" href={`/klub/dochadzka?player=${id}`}>
              História účasti
            </Link>
            {id === v.id && (
              <Link className="text-link" href="/klub/profil">
                Upraviť vlastné kontakty
              </Link>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
