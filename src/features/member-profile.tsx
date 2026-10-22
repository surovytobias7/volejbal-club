import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { MemberProfileView } from "@/components/member-profile-view";
import { InternalNotes } from "@/features/internal-notes";
import type { NotesSearch } from "@/lib/notes";
export async function MemberProfile({
  id,
  search,
}: {
  id: string;
  search: NotesSearch;
}) {
  const v = await requireViewer();
  const [profile, details] = await Promise.all([
    v.db
      .from("profiles")
      .select("id,full_name,active")
      .eq("id", id)
      .maybeSingle(),
    v.db
      .from("member_details")
      .select("email,phone")
      .eq("profile_id", id)
      .maybeSingle(),
  ]);
  if (profile.error || details.error)
    throw new Error("Profil sa nepodarilo načítať.");
  if (!profile.data) notFound();
  return (
    <>
      <MemberProfileView
        profile={profile.data}
        email={details.data?.email ?? null}
        phone={details.data?.phone ?? null}
        own={id === v.id}
      />
      <InternalNotes context={{ playerId: id }} search={search} />
    </>
  );
}
