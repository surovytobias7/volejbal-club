import Link from "next/link";
import { PageHeading } from "@/components/shared";

export default function EventNotFound() {
  return (
    <>
      <PageHeading
        title="Udalosť nie je dostupná"
        description="Udalosť sa nenašla alebo k nej nemáte prístup."
      />
      <Link className="text-link" href="/klub/kalendar">
        Späť na kalendár
      </Link>
    </>
  );
}
