import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm } from "@/components/forms";
import { recover } from "@/features/auth/actions";
export default function Recovery() {
  return (
    <AuthShell>
      <h1>Obnova hesla</h1>
      <p>Zadajte e-mail priradený ku klubovému účtu.</p>
      <ActionForm
        action={recover}
        fields={[{ name: "email", label: "E-mail", type: "email" }]}
        submit="Poslať odkaz"
      />
      <Link className="text-link" href="/prihlasenie">
        Späť na prihlásenie
      </Link>
    </AuthShell>
  );
}
