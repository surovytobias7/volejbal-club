import { Shell } from "@/components/layout";
import { requireViewer } from "@/lib/auth";
import { one } from "@/lib/data";
export default async function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireViewer();
  const club = one(
    await viewer.db.from("club_settings").select("name,logo_url").single(),
  );
  return (
    <Shell
      name={viewer.name}
      club={club.name}
      logo={club.logo_url}
      roles={viewer.roles}
      finance={viewer.canFinance}
    >
      {children}
    </Shell>
  );
}
