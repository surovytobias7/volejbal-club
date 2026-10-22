"use client";

import { useState } from "react";
import { AttendanceBoard } from "@/components/attendance-board";
import type { EventRosterPlayer } from "@/lib/rosters";
import type { AttendanceInput, AttendanceSaveResult } from "@/lib/attendance";

const names = [
  "Adela Bartošová",
  "Alexandra Bieliková",
  "Barbora Černá",
  "Daniela Dúhová",
  "Eliška Fiktívna",
  "Emma Horská",
  "Hana Ihrisková",
  "Ivana Javorová",
  "Jana Klubová",
  "Karolína Lúčová",
  "Laura Malinová",
  "Lucia Nádejná",
  "Mária Obláčková",
  "Nina Podávajúca",
  "Olívia Ranná",
  "Petra Sieťová",
  "Sofia Tréningová",
  "Tamara Ukážková",
  "Valéria Vzorová",
  "Zuzana Zápasová",
];
const initial: EventRosterPlayer[] = names.map((full_name, index) => ({
  profile_id: `00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
  full_name,
  active: true,
  current_member: true,
  can_respond: false,
  availability:
    index % 5 === 0
      ? null
      : {
          response: index === 2 ? "no" : "yes",
          reason: index === 2 ? "Rodinný program" : "",
        },
  attendance: null,
  attendance_reason: "",
  attendance_version: 0,
  attendance_updated_at: null,
}));

// Explicit preview-only memory. No Auth client, Server Actions or storage of
// private data. Refresh intentionally resets this fictional demonstration.
export function DesignPreviewAttendance() {
  const [saved, setSaved] = useState(initial);
  const [failure, setFailure] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [generation, setGeneration] = useState(0);
  async function save(input: AttendanceInput): Promise<AttendanceSaveResult> {
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (failure)
      return {
        error:
          "Ukážkový výpadok spojenia. Zmeny zostali rozpracované; vypnite simuláciu a skúste to znova.",
      };
    if (
      input.changes.some(
        (c) =>
          saved.find((p) => p.profile_id === c.player_id)
            ?.attendance_version !== c.expected_version,
      )
    )
      return {
        error:
          "Ukážkový konflikt. Načítajte aktuálne záznamy a skontrolujte svoju voľbu.",
        conflict: true,
      };
    const records = input.changes.map((c) => ({
      player_id: c.player_id,
      status: c.status,
      reason: c.reason,
      version: c.expected_version + 1,
      updated_at: new Date().toISOString(),
    }));
    setSaved((current) =>
      current.map((p) => {
        const record = records.find((r) => r.player_id === p.profile_id);
        return record
          ? {
              ...p,
              attendance: record.status,
              attendance_reason: record.reason,
              attendance_version: record.version,
              attendance_updated_at: record.updated_at,
            }
          : p;
      }),
    );
    return { records };
  }
  return (
    <>
      <details className="preview-attendance-tools">
        <summary>Fiktívny náhľad dochádzky · skúšobné stavy</summary>
        <p>Údaje sú iba v pamäti náhľadu. Obnovenie stránky ich vymaže.</p>
        <div className="attendance-toolbar">
          <label>
            <input
              type="checkbox"
              checked={failure}
              onChange={(e) => setFailure(e.target.checked)}
            />{" "}
            Simulovať chybu uloženia
          </label>
          <label>
            <input
              type="checkbox"
              checked={cancelled}
              onChange={(e) => setCancelled(e.target.checked)}
            />{" "}
            Zrušený tréning
          </label>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setSaved((current) =>
                current.map((p, i) =>
                  i === 0
                    ? {
                        ...p,
                        attendance: "late",
                        attendance_version: p.attendance_version + 1,
                        attendance_updated_at: new Date().toISOString(),
                      }
                    : p,
                ),
              );
            }}
          >
            Simulovať opravu iným trénerom
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setGeneration((g) => g + 1)}
          >
            Znova otvoriť uložený súpis
          </button>
        </div>
      </details>
      <AttendanceBoard
        key={generation}
        eventId="00000000-0000-4000-8000-000000000030"
        initialPlayers={saved}
        readOnly={cancelled}
        saveAction={save}
        reloadAction={async () => ({ players: saved })}
        preview
      />
    </>
  );
}
