import { z } from "zod";
import { notFound } from "next/navigation";
import { requireViewer, roleNames, type Role } from "@/lib/auth";
import { MemberProfile } from "@/features/member-profile";
import { rows, one } from "@/lib/data";
import { PageHeading, Panel } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { mutate } from "@/features/actions";
import { memberFields, roleOptions, formValues } from "@/features/fields";
export default async function Member({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const v = await requireViewer();
  if (!v.roles.includes("admin")) return <MemberProfile id={id} />;
  const p = one(await v.db.from("profiles").select("*").eq("id", id).single());
  const details = one(
    await v.db.from("member_details").select("*").eq("profile_id", id).single(),
  );
  const roles = rows(
    await v.db.from("user_roles").select("role").eq("profile_id", id),
  );
  const isGuardian = roles.some((r) => r.role === "guardian");
  const children = isGuardian
    ? rows(
        await v.db
          .from("guardian_players")
          .select(
            "player_id,profiles!guardian_players_player_id_fkey(full_name)",
          )
          .eq("guardian_id", id),
      )
    : [];
  return (
    <>
      <PageHeading
        title={p.full_name}
        description="Členský profil a prístupové oprávnenia."
      />
      <div className="two-columns">
        <div className="stack">
          <Panel title="Osobné údaje">
            <div className="panel-body">
              <ActionForm
                action={mutate}
                hidden={{ command: "member-edit", id }}
                fields={memberFields.map((f) => ({
                  ...f,
                  value:
                    f.name === "full_name"
                      ? p.full_name
                      : formValues(details)[f.name] || "",
                }))}
              />
            </div>
          </Panel>
          {isGuardian && (
            <Panel title="Prepojené deti">
              <div className="panel-body">
                {children.map((c) => (
                  <div className="metric-line" key={c.player_id}>
                    <span>
                      {
                        (c.profiles as unknown as { full_name: string })
                          ?.full_name
                      }
                    </span>
                    <ActionForm
                      action={mutate}
                      hidden={{
                        command: "guardian",
                        guardian_id: id,
                        player_id: c.player_id,
                        remove: "true",
                      }}
                      fields={[]}
                      submit="Zrušiť prepojenie"
                      danger
                    />
                  </div>
                ))}
                <ActionForm
                  action={mutate}
                  hidden={{ command: "guardian", guardian_id: id }}
                  fields={[
                    {
                      name: "player_id",
                      label: "Hráč",
                      source: "players",
                    },
                  ]}
                  submit="Prepojiť dieťa"
                />
              </div>
            </Panel>
          )}
        </div>
        <div className="stack">
          <Panel title="Roly a oprávnenia">
            <div className="panel-body">
              {roles.map((r) => (
                <div className="metric-line" key={r.role}>
                  <strong>{roleNames[r.role as Role]}</strong>
                  {!(id === v.id && r.role === "admin") && (
                    <ActionForm
                      action={mutate}
                      hidden={{
                        command: "role",
                        profile_id: id,
                        role: r.role,
                        remove: "true",
                      }}
                      fields={[]}
                      submit="Odobrať"
                      danger
                    />
                  )}
                </div>
              ))}
              <ActionForm
                action={mutate}
                hidden={{ command: "role", profile_id: id }}
                fields={[
                  {
                    name: "role",
                    label: "Pridať rolu",
                    options: roleOptions.filter(
                      (r) => !roles.some((x) => x.role === r.value),
                    ),
                  },
                ]}
                submit="Pridať rolu"
              />
            </div>
          </Panel>
          <Panel title="Prihlasovací účet">
            <div className="panel-body">
              <p className="muted">
                {p.user_id
                  ? "Tento profil je prepojený s účtom."
                  : "Pozvánka sa odošle na e-mail uložený v profile."}
              </p>
              {!p.user_id && p.active && (
                <ActionForm
                  action={mutate}
                  hidden={{ command: "invite", id }}
                  fields={[]}
                  submit="Odoslať pozvánku"
                />
              )}
              {id !== v.id && (
                <ActionForm
                  action={mutate}
                  hidden={{
                    command: "member-active",
                    id,
                    active: String(!p.active),
                  }}
                  fields={[]}
                  submit={p.active ? "Deaktivovať člena" : "Aktivovať člena"}
                  danger={p.active}
                />
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
