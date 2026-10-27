import Link from "next/link";
import { ClubIdentity } from "@/components/club-identity";
import { PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
      <ClubIdentity />
      <div className="mt-12">
        <PageHeading
          title="Stránka nie je dostupná"
          description="Stránka sa nenašla alebo k nej nemáte prístup. Pokračujte cez klubový prehľad."
        />
        <Button asChild>
          <Link href="/klub">Prejsť na prehľad</Link>
        </Button>
      </div>
    </main>
  );
}
