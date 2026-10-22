import Link from "next/link";
import type { z } from "zod";
import type { memberPageSchema } from "@/lib/directories";
import type { chargePageSchema, financeSummarySchema } from "@/lib/finance";
import type { attendancePageSchema } from "@/lib/activity";
import { roleNames } from "@/lib/auth";
import { money, dateTime } from "@/lib/utils";

export function MemberTable({
  members,
  preview = false,
}: {
  members: z.infer<typeof memberPageSchema>["items"];
  preview?: boolean;
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table responsive-table" role="table">
        <caption className="sr-only">Členovia klubu</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">
              Meno
            </th>
            <th scope="col" role="columnheader">
              Roly
            </th>
            <th scope="col" role="columnheader">
              Stav
            </th>
            <th scope="col" role="columnheader">
              Profil
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {members.map((p) => (
            <tr role="row" key={p.id}>
              <td role="cell" data-label="Meno">
                <div className="member-identity">
                  <span className="avatar" aria-hidden>
                    {p.full_name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <strong>{p.full_name}</strong>
                    {p.account_linked !== null && (
                      <small>
                        {p.account_linked
                          ? "Prepojený účet"
                          : "Bez prihlasovacieho účtu"}
                      </small>
                    )}
                  </div>
                </div>
              </td>
              <td role="cell" data-label="Roly">
                {p.roles.map((r) => roleNames[r]).join(", ")}
              </td>
              <td role="cell" data-label="Stav">
                <span className={`badge ${p.active ? "success" : "danger"}`}>
                  {p.active ? "Aktívny" : "Neaktívny"}
                </span>
              </td>
              <td role="cell" data-label="Profil">
                <Link
                  className="text-link"
                  href={
                    preview
                      ? `/ukazka?view=clen&member=${p.id}`
                      : `/klub/clenovia/${p.id}`
                  }
                >
                  Otvoriť profil
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChargeTable({
  records,
  today,
  preview = false,
}: {
  records: z.infer<typeof chargePageSchema>["items"];
  today: string;
  preview?: boolean;
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table responsive-table" role="table">
        <caption className="sr-only">Členské poplatky</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">
              Hráč a poplatok
            </th>
            <th scope="col" role="columnheader">
              Splatnosť
            </th>
            <th scope="col" role="columnheader" className="numeric-cell">
              Suma
            </th>
            <th scope="col" role="columnheader" className="numeric-cell">
              Zostáva
            </th>
            <th scope="col" role="columnheader">
              Stav
            </th>
            <th scope="col" role="columnheader">
              História
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {records.map((c) => (
            <tr role="row" key={c.id}>
              <td role="cell" data-label="Hráč a poplatok">
                <strong>{c.full_name}</strong>
                <small>{c.label}</small>
              </td>
              <td role="cell" data-label="Splatnosť">
                {c.due_date.split("-").reverse().join(". ")}
              </td>
              <td role="cell" data-label="Suma" className="numeric-cell">
                {money(c.amount_cents)}
              </td>
              <td role="cell" data-label="Zostáva" className="numeric-cell">
                <strong>{money(c.remaining)}</strong>
              </td>
              <td role="cell" data-label="Stav">
                <span
                  className={`badge ${c.remaining === 0 ? "success" : c.due_date < today ? "danger" : "match"}`}
                >
                  {c.remaining === 0
                    ? "Uhradené"
                    : c.due_date < today
                      ? "Po splatnosti"
                      : c.remaining < c.amount_cents
                        ? "Čiastočne uhradené"
                        : "Čaká na úhradu"}
                </span>
              </td>
              <td role="cell" data-label="História">
                <Link
                  className="text-link"
                  href={
                    preview ? "/ukazka?view=platba" : `/klub/platby/${c.id}`
                  }
                >
                  Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FinanceSummary({
  summary,
}: {
  summary: z.infer<typeof financeSummarySchema>;
}) {
  return (
    <div className="dashboard-stats finance-summary">
      <div className="stat">
        <span className="muted">Predpísané členské</span>
        <strong>{money(summary.charged)}</strong>
        <small>Všetky dostupné poplatky</small>
      </div>
      <div className="stat">
        <span className="muted">Uhradené</span>
        <strong>{money(summary.paid)}</strong>
        <small>Podľa záznamov klubu</small>
      </div>
      <div className="stat">
        <span className="muted">Zostáva uhradiť</span>
        <strong>{money(summary.remaining)}</strong>
        <small>Vrátane čiastočných úhrad</small>
      </div>
      <div className="stat">
        <span className="muted">Po splatnosti</span>
        <strong>{money(summary.overdue)}</strong>
        <small>Neuhradené k dnešnému dňu</small>
      </div>
    </div>
  );
}

export function AttendanceTable({
  records,
  preview = false,
}: {
  records: z.infer<typeof attendancePageSchema>["items"];
  preview?: boolean;
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table responsive-table" role="table">
        <caption className="sr-only">História účasti</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">
              Hráč
            </th>
            <th scope="col" role="columnheader">
              Udalosť
            </th>
            <th scope="col" role="columnheader">
              Dátum
            </th>
            <th scope="col" role="columnheader">
              Účasť
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {records.map((r) => (
            <tr role="row" key={`${r.event_id}-${r.player_id}`}>
              <td role="cell" data-label="Hráč">
                {r.full_name ?? "Hráč"}
              </td>
              <td role="cell" data-label="Udalosť">
                {r.title ? (
                  <Link
                    className="text-link"
                    href={
                      preview
                        ? "/ukazka?view=udalost"
                        : `/klub/kalendar/${r.event_id}`
                    }
                  >
                    {r.title}
                  </Link>
                ) : (
                  "Historická udalosť"
                )}
              </td>
              <td role="cell" data-label="Dátum">
                {r.starts_at ? dateTime(r.starts_at, "d. M. yyyy") : "—"}
              </td>
              <td role="cell" data-label="Účasť">
                <span
                  className={`badge ${r.status === "present" ? "success" : r.status === "absent" ? "danger" : ""}`}
                >
                  {
                    {
                      present: "Prítomný",
                      absent: "Neprítomný",
                      excused: "Ospravedlnený",
                    }[r.status]
                  }
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
