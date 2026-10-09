import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
export default function Setup() {
  const preview = process.env.ENABLE_DESIGN_PREVIEW === "true";
  return (
    <AuthShell>
      <h1>Pripravme váš klub</h1>
      <p>
        Aplikácia zatiaľ nie je pripojená ku klubovej databáze. Správca dokončí
        tieto kroky:
      </p>
      <ol className="setup-list">
        <li>Nastaví pripojenie k Supabase.</li>
        <li>Použije databázové migrácie.</li>
        <li>Vytvorí prvý administrátorský účet.</li>
      </ol>
      <p>Presný postup nájdete v projektovom súbore README.md.</p>
      {preview && (
        <Button asChild className="mt-6">
          <Link href="/ukazka">Pozrieť ukážku rozhrania</Link>
        </Button>
      )}
      <Link className="text-link" href="/prihlasenie">
        Prejsť na prihlásenie
      </Link>
    </AuthShell>
  );
}
