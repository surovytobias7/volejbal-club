import Link from "next/link";
import { PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function ClubNotFound() {
  return (
    <>
      <PageHeading
        title="Stránka nie je dostupná"
        description="Stránka sa nenašla alebo k nej nemáte prístup. Pokračujte cez klubový prehľad."
      />
      <Button asChild>
        <Link href="/klub">Prejsť na prehľad</Link>
      </Button>
    </>
  );
}
