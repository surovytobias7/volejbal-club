"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, Clock3, ShieldCheck, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  attendanceChanges,
  attendanceLabels,
  type AttendanceDraft,
  type AttendanceInput,
  type AttendanceSaveResult,
  type AttendanceReloadResult,
  type AttendanceStatus,
} from "@/lib/attendance";
import type { EventRosterPlayer } from "@/lib/rosters";
import { dateTime } from "@/lib/utils";

const choices = [
  { status: "present", icon: Check },
  { status: "absent", icon: X },
  { status: "late", icon: Clock3 },
  { status: "excused", icon: ShieldCheck },
] as const;
const availabilityLabels = { yes: "Príde", no: "Nepríde", maybe: "Ešte nevie" };
const draftOf = (player: EventRosterPlayer): AttendanceDraft => ({
  status: player.attendance,
  reason: player.attendance_reason,
});

export function AttendanceBoard({
  eventId,
  initialPlayers,
  readOnly: initialReadOnly = false,
  saveAction,
  reloadAction,
  preview = false,
}: {
  eventId: string;
  initialPlayers: EventRosterPlayer[];
  readOnly?: boolean;
  saveAction: (input: AttendanceInput) => Promise<AttendanceSaveResult>;
  reloadAction: (eventId: string) => Promise<AttendanceReloadResult>;
  preview?: boolean;
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [cancelled, setCancelled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const readOnly = initialReadOnly || cancelled;
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>(() =>
    Object.fromEntries(initialPlayers.map((p) => [p.profile_id, draftOf(p)])),
  );
  const [query, setQuery] = useState("");
  const [onlyUnmarked, setOnlyUnmarked] = useState(false);
  // Keep the row being edited visible until focus leaves it. Otherwise the
  // unmarked filter removes an excused player before a reason can be entered.
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>({
    text: "",
  });
  const [conflict, setConflict] = useState(false);
  const [review, setReview] = useState<string[]>([]);
  const [bulkUndo, setBulkUndo] = useState<Record<
    string,
    AttendanceDraft
  > | null>(null);
  const saveLock = useRef(false);
  const changes = attendanceChanges(players, drafts);
  const dirty = changes.length > 0;
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("sk");
  const visible = players.filter(
    (p) =>
      normalize(p.full_name).includes(normalize(query)) &&
      (!onlyUnmarked ||
        drafts[p.profile_id]?.status === null ||
        p.profile_id === activePlayer),
  );
  const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
  for (const player of players)
    counts[drafts[player.profile_id]?.status ?? "unmarked"]++;

  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const leave = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (
        !anchor ||
        anchor.getAttribute("href")?.startsWith("#") ||
        anchor.getAttribute("target") === "_blank" ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (
        !window.confirm(
          "Máte neuloženú dochádzku. Naozaj chcete odísť bez uloženia?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty]);

  function mark(id: string, status: AttendanceStatus | null) {
    setActivePlayer(id);
    setDrafts((current) => ({
      ...current,
      [id]: { status, reason: status === "excused" ? current[id].reason : "" },
    }));
    setReview((current) => current.filter((value) => value !== id));
    setBulkUndo(null);
    setFeedback({ text: "" });
  }
  async function save() {
    if (
      saveLock.current ||
      readOnly ||
      unavailable ||
      !dirty ||
      review.length ||
      conflict
    )
      return;
    saveLock.current = true;
    setBusy(true);
    setFeedback({ text: "Ukladám dochádzku…" });
    try {
      const result = await saveAction({ event_id: eventId, changes });
      if (result.error !== undefined) {
        setFeedback({ text: result.error, error: true });
        setConflict(!!result.conflict);
        return;
      }
      const records = new Map(
        result.records.map((record) => [record.player_id, record]),
      );
      setPlayers((current) =>
        current.map((p) => {
          const record = records.get(p.profile_id);
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
      setDrafts((current) => ({
        ...current,
        ...Object.fromEntries(
          result.records.map((record) => [
            record.player_id,
            { status: record.status, reason: record.reason },
          ]),
        ),
      }));
      setBulkUndo(null);
      setActivePlayer(null);
      setFeedback({
        text: preview
          ? "Ukážkové zmeny sú uložené iba v tomto náhľade."
          : `Dochádzka uložená o ${dateTime(new Date().toISOString(), "HH:mm")}.`,
      });
    } catch {
      setFeedback({
        text: "Uloženie sa nepodarilo potvrdiť. Zmeny zostali rozpracované. Skontrolujte pripojenie a skúste to znova.",
        error: true,
      });
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    if (saveLock.current) return;
    saveLock.current = true;
    setBusy(true);
    try {
      const result = await reloadAction(eventId);
      if (!result.players) {
        if (result.unavailable) {
          setUnavailable(true);
          setPlayers([]);
          setDrafts({});
          setReview([]);
          setBulkUndo(null);
        }
        setFeedback({
          text: result.error || "Záznamy sa nepodarilo načítať.",
          error: true,
        });
        return;
      }
      if (result.readOnly) {
        setCancelled(true);
        setPlayers(result.players);
        setDrafts(
          Object.fromEntries(
            result.players.map((p) => [p.profile_id, draftOf(p)]),
          ),
        );
        setReview([]);
        setConflict(false);
        setBulkUndo(null);
        setFeedback({
          text: "Tréning bol zrušený. Zobrazená je aktuálne uložená dochádzka.",
        });
        return;
      }
      const dirtyIds = new Set(changes.map((c) => c.player_id));
      const previous = new Map(players.map((p) => [p.profile_id, p]));
      const conflicts = result.players
        .filter(
          (p) =>
            dirtyIds.has(p.profile_id) &&
            p.attendance_version !==
              previous.get(p.profile_id)?.attendance_version,
        )
        .map((p) => p.profile_id);
      const removed = changes.filter(
        (c) => !result.players!.some((p) => p.profile_id === c.player_id),
      ).length;
      setDrafts((current) =>
        Object.fromEntries(
          result.players!.map((p) => [
            p.profile_id,
            dirtyIds.has(p.profile_id) ? current[p.profile_id] : draftOf(p),
          ]),
        ),
      );
      setPlayers(result.players);
      setReview(conflicts);
      setConflict(false);
      setBulkUndo(null);
      setFeedback({
        text: removed
          ? `Súpis sa zmenil. Nedostupní hráči: ${removed}; ich rozpracované zmeny neboli uložené. Skontrolujte zostávajúci súpis.`
          : conflicts.length
            ? "Aktuálne záznamy sú načítané. Pri označených hráčoch potvrďte svoju voľbu alebo použite uložený stav."
            : "Aktuálne záznamy sú načítané. Vaše rozpracované zmeny zostali zachované.",
      });
    } catch {
      setFeedback({
        text: "Záznamy sa nepodarilo načítať. Skúste to znova.",
        error: true,
      });
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  if (unavailable)
    return (
      <p className="feedback feedback-error" role="alert">
        {feedback.text}
      </p>
    );

  return (
    <section
      className="attendance-board"
      id="dochadzka"
      aria-labelledby="attendance-heading"
    >
      <div className="attendance-heading">
        <div>
          <h2 id="attendance-heading">Skutočná dochádzka</h2>
          <p className="muted">
            {readOnly
              ? "Prehľad uloženej účasti. Plánované odpovede sú uvedené samostatne."
              : "Označte účasť a uložte zmeny. Plánované odpovede zostanú nezmenené."}
          </p>
        </div>
        <span className="attendance-total">{players.length} hráčov</span>
      </div>
      <div className="attendance-counts" aria-label="Počty hráčov podľa účasti">
        <span>
          <strong>{counts.unmarked}</strong> Neoznačení
        </span>
        <span className="attendance-present">
          <strong>{counts.present}</strong> Prítomní
        </span>
        <span className="attendance-absent">
          <strong>{counts.absent}</strong> Neprítomní
        </span>
        <span className="attendance-late">
          <strong>{counts.late}</strong> Meškanie
        </span>
        <span className="attendance-excused">
          <strong>{counts.excused}</strong> Ospravedlnení
        </span>
      </div>
      {readOnly && (
        <p className="feedback" role="status">
          Zrušená udalosť. Dochádzku si môžete prezrieť, zmeny nie sú povolené.
          {cancelled &&
            " Rozpracovaný súpis bol nahradený aktuálne uloženou dochádzkou."}
        </p>
      )}
      <div className="attendance-toolbar">
        {players.length >= 8 && (
          <label className="attendance-search">
            <Search size={18} aria-hidden />
            <span className="sr-only">Hľadať hráča v súpise</span>
            <input
              type="search"
              name="attendance-search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hľadať hráča"
            />
          </label>
        )}
        <label className="attendance-filter">
          <input
            type="checkbox"
            checked={onlyUnmarked}
            onChange={(e) => setOnlyUnmarked(e.target.checked)}
          />{" "}
          Len neoznačení
        </label>
        {!readOnly && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !counts.unmarked || conflict || review.length > 0}
            onClick={() => {
              setBulkUndo(drafts);
              setActivePlayer(null);
              setDrafts((current) =>
                Object.fromEntries(
                  players.map((p) => [
                    p.profile_id,
                    current[p.profile_id].status === null
                      ? { status: "present", reason: "" }
                      : current[p.profile_id],
                  ]),
                ),
              );
              setFeedback({
                text: `Neoznačení hráči (${counts.unmarked}) sú prítomní. Ostatné označenia zostali zachované.`,
              });
            }}
          >
            <Check size={18} aria-hidden /> Neoznačení prítomní
          </Button>
        )}
        {!readOnly && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !players.length || conflict || review.length > 0}
            onClick={() => {
              setBulkUndo(drafts);
              setActivePlayer(null);
              setDrafts(
                Object.fromEntries(
                  players.map((p) => [
                    p.profile_id,
                    { status: "present", reason: "" },
                  ]),
                ),
              );
              setFeedback({
                text: `Všetci hráči (${players.length}) sú označení ako prítomní. Výnimky upravte pred uložením.`,
              });
            }}
          >
            <Check size={18} aria-hidden /> Všetci prítomní
          </Button>
        )}
        {bulkUndo && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setDrafts(bulkUndo);
              setBulkUndo(null);
              setFeedback({ text: "Hromadné označenie bolo vrátené." });
            }}
          >
            <RotateCcw size={16} aria-hidden /> Vrátiť označenie
          </Button>
        )}
      </div>
      {(query || onlyUnmarked) && (
        <p className="muted attendance-search-count" role="status">
          Zobrazení: {visible.length} z {players.length}.
          {!readOnly && " Hromadné označenie platí pre celý súpis."}
          {!readOnly &&
            onlyUnmarked &&
            " Rozpracovaný riadok zostáva viditeľný počas úpravy."}
        </p>
      )}
      <ul className="attendance-roster">
        {visible.map((player) => {
          const draft = drafts[player.profile_id];
          const needsReview = review.includes(player.profile_id);
          const changed = changes.some(
            (c) => c.player_id === player.profile_id,
          );
          return (
            <li
              key={player.profile_id}
              className={`attendance-player ${needsReview ? "attendance-review" : ""}`}
              onFocusCapture={() => setActivePlayer(player.profile_id)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setActivePlayer(null);
              }}
            >
              <div className="attendance-player-info">
                <strong>{player.full_name}</strong>
                <span
                  className={`attendance-current attendance-${draft.status ?? "unmarked"}`}
                >
                  {draft.status ? attendanceLabels[draft.status] : "Neoznačený"}
                  {changed ? " · neuložené" : ""}
                </span>
                <small className="muted">
                  Plán:{" "}
                  {player.availability
                    ? availabilityLabels[player.availability.response]
                    : "Bez odpovede"}
                  {player.availability?.reason
                    ? ` — ${player.availability.reason}`
                    : ""}
                </small>
                {!player.current_member && (
                  <small className="muted">
                    Historický záznam · mimo aktuálneho súpisu
                  </small>
                )}
              </div>
              <div className="attendance-player-actions">
                {!readOnly && (
                  <div
                    className="attendance-choices"
                    role="group"
                    aria-label={`Dochádzka: ${player.full_name}`}
                  >
                    {choices.map(({ status, icon: Icon }) => (
                      <button
                        key={status}
                        type="button"
                        className={`attendance-choice attendance-${status}`}
                        aria-pressed={draft.status === status}
                        disabled={busy}
                        onClick={() => mark(player.profile_id, status)}
                      >
                        <Icon size={19} aria-hidden />
                        <span>{attendanceLabels[status]}</span>
                      </button>
                    ))}
                  </div>
                )}
                {draft.status === "excused" &&
                  (readOnly ? (
                    <p>{draft.reason || "Bez uvedeného dôvodu"}</p>
                  ) : (
                    <label className="attendance-reason">
                      Dôvod ospravedlnenia{" "}
                      <span className="muted">(nepovinné)</span>
                      <input
                        name={`attendance-reason-${player.profile_id}`}
                        autoComplete="off"
                        value={draft.reason}
                        maxLength={200}
                        disabled={busy}
                        placeholder="Stručne, bez zdravotných detailov"
                        onChange={(e) => {
                          setDrafts((current) => ({
                            ...current,
                            [player.profile_id]: {
                              ...current[player.profile_id],
                              reason: e.target.value,
                            },
                          }));
                          setFeedback({ text: "" });
                          setBulkUndo(null);
                        }}
                      />
                    </label>
                  ))}
                <div className="attendance-row-meta">
                  {player.attendance_updated_at && (
                    <small className="muted">
                      Uložené{" "}
                      {dateTime(
                        player.attendance_updated_at,
                        "d. M. yyyy, HH:mm",
                      )}
                    </small>
                  )}
                  {!readOnly && draft.status !== null && (
                    <button
                      className="attendance-clear"
                      type="button"
                      disabled={busy}
                      aria-label={`Zrušiť označenie: ${player.full_name}`}
                      onClick={() => mark(player.profile_id, null)}
                    >
                      Zrušiť označenie
                    </button>
                  )}
                </div>
                {needsReview && (
                  <div className="attendance-conflict">
                    <p>
                      Medzitým uložené:{" "}
                      <strong>
                        {player.attendance
                          ? attendanceLabels[player.attendance]
                          : "Neoznačený"}
                      </strong>
                      {player.attendance_reason
                        ? ` — ${player.attendance_reason}`
                        : ""}
                      . Potvrďte svoju voľbu tlačidlom vyššie.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setDrafts((current) => ({
                          ...current,
                          [player.profile_id]: draftOf(player),
                        }));
                        setReview((current) =>
                          current.filter((id) => id !== player.profile_id),
                        );
                        setFeedback({
                          text: "Použili ste aktuálne uložený stav hráča.",
                        });
                      }}
                    >
                      Použiť uložený stav
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {!visible.length && (
        <div className="attendance-empty">
          <h3>
            {players.length
              ? "Žiadni hráči podľa filtra"
              : "Tréning zatiaľ nemá hráčov"}
          </h3>
          <p className="muted">
            {players.length
              ? "Upravte vyhľadávanie alebo vypnite filter neoznačených."
              : "Skontrolujte aktívne členstvo hráčov v tíme."}
          </p>
        </div>
      )}
      {!readOnly && (
        <div className="attendance-savebar">
          <div>
            <strong>
              {dirty
                ? `Neuložené zmeny: ${changes.length}`
                : "Žiadne neuložené zmeny"}
            </strong>
            <p className="muted">
              Neoznačení hráči sa nepočítajú ako neprítomní.
            </p>
          </div>
          <Button
            type="button"
            disabled={busy || !dirty || conflict || review.length > 0}
            onClick={save}
          >
            {busy ? "Počkajte…" : "Uložiť dochádzku"}
          </Button>
          <div
            className={`attendance-feedback ${feedback.error ? "attendance-error" : ""}`}
            role={feedback.error ? "alert" : "status"}
            aria-live="polite"
          >
            {feedback.text}
          </div>
          {(conflict || feedback.error) && (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={reload}
            >
              Načítať aktuálne záznamy
            </Button>
          )}
          {review.length > 0 && (
            <p className="attendance-error" role="status">
              Skontrolujte konfliktné záznamy: {review.length}.{" "}
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setQuery("");
                  setOnlyUnmarked(false);
                }}
              >
                Zobraziť celý súpis
              </button>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
