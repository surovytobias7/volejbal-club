import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm } from "@/components/forms";
import { login } from "@/features/auth/actions";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return (
    <AuthShell>
      <h1>Vitajte v klube</h1>
      <p>Prihláste sa do svojho klubového účtu.</p>
      {status && (
        <p className="feedback feedback-error">
          {status === "inactive"
            ? "Účet nie je aktívny alebo nemá klubový profil. Kontaktujte správcu."
            : "Odkaz je neplatný alebo vypršal. Vyžiadajte si nový."}
        </p>
      )}
      <ActionForm
        action={login}
        fields={[
          { name: "email", label: "E-mail", type: "email" },
          { name: "password", label: "Heslo", type: "password" },
        ]}
        submit="Prihlásiť sa"
      />
      <Link className="text-link" href="/obnova-hesla">
        Zabudli ste heslo?
      </Link>
      <p>Nový člen? Pozvánku vám pošle správca klubu.</p>
    </AuthShell>
  );
}
