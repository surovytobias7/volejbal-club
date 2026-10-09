"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>Údaje sa nepodarilo načítať</h1>
      <p className="muted">
        Skontrolujte pripojenie a skúste to znova. Ak problém pretrváva,
        kontaktujte správcu klubu.
      </p>
      <Button onClick={reset} className="mt-6">
        Skúsiť znova
      </Button>
    </div>
  );
}
