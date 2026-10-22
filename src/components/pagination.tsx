import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pagination({
  firstHref,
  nextHref,
  continued,
  count,
}: {
  firstHref: string;
  nextHref?: string;
  continued: boolean;
  count: number;
}) {
  return (
    <nav aria-label="Stránkovanie záznamov" className="pagination">
      <span className="muted text-sm" role="status">
        Zobrazené záznamy: {count}
      </span>
      <div className="flex flex-wrap gap-2">
        {continued && (
          <Button asChild variant="ghost">
            <Link href={firstHref}>Na začiatok</Link>
          </Button>
        )}
        {nextHref && (
          <Button asChild variant="secondary">
            <Link href={nextHref}>Ďalšie záznamy</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
