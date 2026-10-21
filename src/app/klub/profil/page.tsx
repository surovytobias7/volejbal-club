import { requireViewer, roleNames } from "@/lib/auth";
import { one } from "@/lib/data";
import { PageHeading, Panel } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { mutate } from "@/features/actions";
export default async function Profile() {
  const v = await requireViewer();
  const details = one(
    await v.db
      .from("member_details")
      .select("phone,email")
      .eq("profile_id", v.id)
      .single(),
  );
  return (
    <>
      <PageHeading
        title="Môj profil"
        description="Udržujte svoje kontaktné údaje aktuálne."
      />
      <div className="member-profile-layout">
        <Panel title="Osobné údaje">
          <div className="panel-body">
            <ActionForm
              action={mutate}
              hidden={{ command: "profile" }}
              fields={[
                {
                  name: "full_name",
                  label: "Meno a priezvisko",
                  value: v.name,
                },
                {
                  name: "phone",
                  label: "Telefón",
                  type: "tel",
                  value: details.phone || "",
                  required: false,
                },
              ]}
            />
          </div>
        </Panel>
        <Panel title="Váš klubový účet" plain>
          <div className="panel-body">
            <dl className="profile-facts">
              <div>
                <dt>Roly</dt>
                <dd>{v.roles.map((r) => roleNames[r]).join(", ")}</dd>
              </div>
              <div>
                <dt>E-mail v evidencii</dt>
                <dd>{details.email || "Neuvedený"}</dd>
              </div>
            </dl>
            <p className="muted mt-4">
              Zmenu prihlasovacieho e-mailu, dátumu narodenia a prepojenia
              rodiny vybavuje správca klubu.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
