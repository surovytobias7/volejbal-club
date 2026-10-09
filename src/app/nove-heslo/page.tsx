import { AuthShell } from "@/components/auth-shell";
import { ActionForm } from "@/components/forms";
import { changePassword } from "@/features/auth/actions";
export default function Password() {
  return (
    <AuthShell>
      <h1>Nastavte si heslo</h1>
      <p>Použite aspoň 12 znakov. Heslo nikomu neposielajte.</p>
      <ActionForm
        action={changePassword}
        fields={[{ name: "password", label: "Nové heslo", type: "password" }]}
        submit="Uložiť heslo"
      />
    </AuthShell>
  );
}
