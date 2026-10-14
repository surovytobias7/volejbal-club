import { requireAdmin } from "@/lib/auth";
import { one } from "@/lib/data";
import { PageHeading, Panel } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { mutate } from "@/features/actions";
export default async function Settings() {
  const v = await requireAdmin();
  const club = one(await v.db.from("club_settings").select("*").single());
  return (
    <>
      <PageHeading
        title="Nastavenia klubu"
        description="Identita, kontakty a základné nastavenia vášho klubu."
      />
      <div className="two-columns">
        <Panel title="Klubové informácie">
          <div className="panel-body">
            <ActionForm
              action={mutate}
              hidden={{ command: "settings" }}
              fields={[
                { name: "name", label: "Názov klubu", value: club.name },
                {
                  name: "email",
                  label: "Kontaktný e-mail",
                  type: "email",
                  value: club.email,
                  required: false,
                },
                {
                  name: "phone",
                  label: "Telefón",
                  type: "tel",
                  value: club.phone,
                  required: false,
                },
                {
                  name: "venue",
                  label: "Predvolené miesto tréningov",
                  value: club.venue,
                  required: false,
                },
                {
                  name: "logo_url",
                  label: "Adresa klubového loga",
                  type: "url",
                  value: club.logo_url || "",
                  required: false,
                  hint: "HTTPS adresa obrázka spravovaného klubom.",
                },
                {
                  name: "categories",
                  label: "Tímové kategórie",
                  value: club.categories.join(", "),
                  required: false,
                  hint: "Kategórie oddeľte čiarkou, napríklad U14, U16, U18, Seniori. Najviac 50 znakov na kategóriu. Prázdny zoznam umožní vlastnú kategóriu pri tvorbe tímu.",
                },
              ]}
            />
          </div>
        </Panel>
        <Panel title="Regionálne nastavenia">
          <div className="panel-body">
            <div className="metric-line">
              <span>Jazyk</span>
              <strong>Slovenčina</strong>
            </div>
            <div className="metric-line">
              <span>Mena</span>
              <strong>EUR</strong>
            </div>
            <div className="metric-line">
              <span>Časové pásmo</span>
              <strong>Europe/Bratislava</strong>
            </div>
            <div className="metric-line">
              <span>Začiatok týždňa</span>
              <strong>Pondelok</strong>
            </div>
            <p className="muted mt-4">
              Citlivé zmeny sa zaznamenávajú do histórie zmien.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
