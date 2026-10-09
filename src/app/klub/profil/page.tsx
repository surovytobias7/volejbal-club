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
      <div className="two-columns">
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
        <Panel title="Váš klubový účet">
          <div className="panel-body">
            <div className="metric-line">
              <span>Roly</span>
              <strong>{v.roles.map((r) => roleNames[r]).join(", ")}</strong>
            </div>
            <div className="metric-line">
              <span>E-mail v evidencii</span>
              <strong>{details.email || "Neuvedený"}</strong>
            </div>
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
