import { AttendanceTable } from "@/components/records";
import { AttendanceSessions } from "@/features/attendance-sessions";
import Link from "next/link";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { one } from "@/lib/data";
import { PageHeading, Panel, Empty } from "@/components/shared";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import {
  attendancePageSchema,
  attendanceCursorSchema,
  attendanceStatus,
} from "@/lib/activity";
import { directoryQuery, type DirectorySearch } from "@/lib/directories";
export default async function Attendance({
  searchParams,
}: {
  searchParams: DirectorySearch;
}) {
  const v = await requireViewer();
  const params = await searchParams;
  const q = directoryQuery(params);
  const player = z.uuid().safeParse(params.player).data;
  const status = attendanceStatus.safeParse(params.status).data;
  const cursor = attendanceCursorSchema.safeParse(params).data;
  const page = attendancePageSchema.parse(
    one(
      await v.db.rpc("attendance_page", {
        p_query: q,
        p_player: player ?? null,
        p_status: status ?? null,
        p_at: cursor?.at ?? null,
        p_event: cursor?.event ?? null,
        p_cursor_player: cursor?.cursorPlayer ?? null,
      }),
    ),
  );
  const filters = new URLSearchParams({
    q,
    ...(player ? { player } : {}),
    ...(status ? { status } : {}),
  });
  const firstHref = `/klub/dochadzka?${filters}`;
  const last = page.items.at(-1);
  if (last) {
    filters.set("at", last.updated_at);
    filters.set("event", last.event_id);
    filters.set("cursorPlayer", last.player_id);
  }
  return (
    <>
      <PageHeading
        title="Dochádzka"
        description="Skutočná účasť zaznamenaná trénerom. Potvrdenie účasti sa do štatistiky nezapočítava."
      />
      <AttendanceSessions />
      <form className="toolbar">
        {player && <input type="hidden" name="player" value={player} />}
        <label className="field">
          Meno hráča
          <input
            name="q"
            defaultValue={q}
            maxLength={160}
            placeholder="Hľadať v celej histórii"
          />
        </label>
        <label className="field">
          Účasť
          <select name="status" defaultValue={status ?? ""}>
            <option value="">Všetky stavy</option>
            <option value="present">Prítomný</option>
            <option value="absent">Neprítomný</option>
            <option value="late">Meškanie</option>
            <option value="excused">Ospravedlnený</option>
          </select>
        </label>
        <Button variant="secondary">Filtrovať</Button>
        <Link className="text-link" href="/klub/dochadzka">
          Zrušiť filtre
        </Link>
      </form>
      <div className="dashboard-stats attendance-summary">
        <div className="stat">
          <span className="muted">Zaznamenaná účasť</span>
          <strong>
            {page.total
              ? `${Math.round(((page.present + page.late) / page.total) * 100)} %`
              : "—"}
          </strong>
          <small>Všetky záznamy podľa filtrov ({page.total})</small>
        </div>
        <div className="stat">
          <span className="muted">Prítomní</span>
          <strong>{page.present}</strong>
          <small>Okrem toho s meškaním: {page.late}</small>
        </div>
        <div className="stat">
          <span className="muted">Neprítomní</span>
          <strong>{page.absent}</strong>
          <small>Bez ospravedlnenia</small>
        </div>
        <div className="stat">
          <span className="muted">Ospravedlnení</span>
          <strong>{page.excused}</strong>
          <small>Podľa záznamu trénera</small>
        </div>
      </div>
      <Panel title="História účasti">
        {page.items.length ? (
          <AttendanceTable records={page.items} />
        ) : (
          <Empty
            title="Žiadne záznamy podľa filtrov"
            description="Upravte vyhľadávanie alebo počkajte na zaznamenanie účasti trénerom."
          />
        )}
        <Pagination
          firstHref={firstHref}
          count={page.items.length}
          continued={!!cursor}
          nextHref={
            page.has_more && last ? `/klub/dochadzka?${filters}` : undefined
          }
        />
      </Panel>
    </>
  );
}
