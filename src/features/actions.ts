"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { feePeriodSchema } from "@/lib/fee-period";
import { categoriesSchema } from "@/lib/club-settings";
import { createClient } from "@supabase/supabase-js";
import { requireViewer } from "@/lib/auth";
import { appUrl, publicEnvironment } from "@/lib/env";
import { localToUtc } from "@/lib/utils";
import type { FormState } from "@/components/forms";
import { selectedIds } from "@/lib/selectors";
import { memberPrivateDetailsSchema } from "@/lib/access";
import {
  requireEvent,
  requireManagedTeam,
  requireParticipation,
  requireManagedAnnouncement,
} from "@/lib/mutation-access";

const uuid = z.uuid();
const text = (max = 140) =>
  z
    .string()
    .trim()
    .min(2, "Vyplňte aspoň 2 znaky.")
    .max(max, "Text je príliš dlhý.");
const optionalText = (max = 500) => z.string().trim().max(max).default("");
const amount = z
  .string()
  .regex(
    /^\d+(?:[.,]\d{1,2})?$/,
    "Zadajte sumu s najviac dvoma desatinnými miestami.",
  )
  .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
  .pipe(z.number().int().min(1).max(100000000));
const role = z.enum(["admin", "coach", "player", "guardian"]);
function check(result: { error: { message: string; code?: string } | null }) {
  if (result.error)
    throw new Error(
      result.error.code === "23505"
        ? "Tento záznam už existuje."
        : "Zmenu sa nepodarilo uložiť. Skontrolujte údaje a svoje oprávnenia.",
    );
}

export async function mutate(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const { db } = viewer;
  const data = Object.fromEntries(form);
  const admin = () => {
    if (!viewer.roles.includes("admin"))
      throw new Error("Na túto zmenu nemáte oprávnenie.");
  };
  try {
    switch (data.command) {
      case "team": {
        admin();
        const parsed = z
          .object({
            name: text(100),
            category: z.string().trim().min(1).max(50),
            description: optionalText(2000),
          })
          .parse(data);
        if (data.id)
          check(
            await db
              .from("teams")
              .update(parsed)
              .eq("id", uuid.parse(data.id))
              .select("id")
              .single(),
          );
        else check(await db.from("teams").insert(parsed));
        break;
      }
      case "archive-team": {
        admin();
        check(
          await db
            .from("teams")
            .update({ archived: data.archived === "true" })
            .eq("id", uuid.parse(data.id))
            .select("id")
            .single(),
        );
        break;
      }
      case "member": {
        admin();
        const p = z
          .object({
            full_name: text(120),
            email: z.union([z.email(), z.literal("")]),
            phone: optionalText(40),
            birth_date: z.union([z.iso.date(), z.literal("")]),
            role,
          })
          .parse(data);
        check(
          await db.rpc("create_member", {
            p_name: p.full_name,
            p_email: p.email || null,
            p_phone: p.phone || null,
            p_birth: p.birth_date || null,
            p_role: p.role,
          }),
        );
        break;
      }
      case "member-edit": {
        admin();
        const p = z
          .object({
            id: uuid,
            full_name: text(120),
            email: z.union([z.email(), z.literal("")]),
            phone: optionalText(40),
            birth_date: z.union([z.iso.date(), z.literal("")]),
          })
          .parse(data);
        check(
          await db.rpc("edit_member", {
            p_id: p.id,
            p_name: p.full_name,
            p_email: p.email || null,
            p_phone: p.phone || null,
            p_birth: p.birth_date || null,
          }),
        );
        break;
      }
      case "member-active": {
        admin();
        const id = uuid.parse(data.id);
        if (id === viewer.id)
          throw new Error("Vlastný účet nemôžete deaktivovať.");
        check(
          await db
            .from("profiles")
            .update({ active: data.active === "true" })
            .eq("id", id)
            .select("id")
            .single(),
        );
        break;
      }
      case "role": {
        admin();
        const p = z.object({ profile_id: uuid, role }).parse(data);
        if (data.remove === "true") {
          if (p.profile_id === viewer.id && p.role === "admin")
            throw new Error("Vlastnú administrátorskú rolu nemôžete odobrať.");
          check(
            await db
              .from("user_roles")
              .delete()
              .match(p)
              .select("profile_id")
              .single(),
          );
        } else check(await db.from("user_roles").insert(p));
        break;
      }
      case "membership": {
        admin();
        const p = z
          .object({
            team_id: uuid,
            profile_id: uuid,
            kind: z.enum(["coach", "player"]),
          })
          .parse(data);
        if (data.remove === "true")
          check(
            await db
              .from("team_memberships")
              .delete()
              .match(p)
              .select("profile_id")
              .single(),
          );
        else check(await db.from("team_memberships").insert(p));
        break;
      }
      case "guardian": {
        admin();
        const p = z.object({ guardian_id: uuid, player_id: uuid }).parse(data);
        if (data.remove === "true")
          check(
            await db
              .from("guardian_players")
              .delete()
              .match(p)
              .select("player_id")
              .single(),
          );
        else check(await db.from("guardian_players").insert(p));
        break;
      }
      case "invite": {
        admin();
        const id = uuid.parse(data.id);
        const { data: profile, error } = await db
          .from("profiles")
          .select("id,active")
          .eq("id", id)
          .single();
        check({ error });
        const privateResult = await db.rpc("member_private_details", {
          p_id: id,
        });
        check(privateResult);
        const details = memberPrivateDetailsSchema.parse(privateResult.data);
        if (!profile?.active || details.account_linked)
          throw new Error("Účet už je prepojený alebo je neaktívny.");
        const email = z.email().parse(details.email);
        const env = publicEnvironment();
        const key = process.env.SUPABASE_SECRET_KEY;
        if (!env || !key)
          throw new Error("Správca musí nastaviť serverový kľúč pre pozvánky.");
        const privileged = createClient(env.url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: invite, error: inviteError } =
          await privileged.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${appUrl()}/nove-heslo`,
          });
        if (inviteError || !invite.user)
          throw new Error(
            "Pozvánku sa nepodarilo odoslať. Skontrolujte e-mail, nastavenie doručovania a existujúci účet v Supabase.",
          );
        const linked = await db.rpc("link_member_account", {
          p_id: id,
          p_user: invite.user.id,
        });
        if (linked.error)
          throw new Error(
            "Pozvánka bola odoslaná, ale účet sa nepodarilo prepojiť. Správca musí dokončiť prepojenie podľa dokumentácie.",
          );
        revalidatePath("/klub", "layout");
        return {
          success: "Pozvánka bola odovzdaná službe Supabase na doručenie.",
        };
      }
      case "event": {
        const p = z
          .object({
            team_id: uuid,
            title: text(),
            kind: z.enum([
              "training",
              "match",
              "tournament",
              "meeting",
              "other",
            ]),
            description: optionalText(5000),
            venue: text(200),
            starts_at: z.string(),
            ends_at: z.string(),
            opponent: optionalText(120),
            score: optionalText(40),
            home: z.string().optional(),
            weeks: z.coerce.number().int().min(1).max(52).default(1),
          })
          .parse(data);
        const event = {
          team_id: p.team_id,
          title: p.title,
          kind: p.kind,
          description: p.description,
          venue: p.venue,
          starts_at: localToUtc(p.starts_at),
          ends_at: localToUtc(p.ends_at),
          opponent: p.kind === "match" ? p.opponent : null,
          score: p.kind === "match" ? p.score : null,
          home: p.kind === "match" ? p.home === "true" : null,
        };
        if (event.ends_at <= event.starts_at)
          throw new Error("Koniec musí byť po začiatku udalosti.");
        await requireManagedTeam(viewer, p.team_id);
        if (data.id) await requireEvent(viewer, uuid.parse(data.id), true);
        if (data.id)
          check(
            await db
              .from("events")
              .update(event)
              .eq("id", uuid.parse(data.id))
              .select("id")
              .single(),
          );
        else {
          const shift = (value: string, weeks: number) => {
            const d = new Date(`${value}:00Z`);
            d.setUTCDate(d.getUTCDate() + weeks * 7);
            return localToUtc(d.toISOString().slice(0, 16));
          };
          const events = Array.from({ length: p.weeks }, (_, i) => ({
            ...event,
            starts_at: shift(p.starts_at, i),
            ends_at: shift(p.ends_at, i),
          }));
          check(await db.rpc("create_event_batch", { p_events: events }));
        }
        break;
      }
      case "event-status": {
        const p = z
          .object({
            id: uuid,
            status: z.enum(["scheduled", "cancelled", "completed"]),
          })
          .parse(data);
        await requireEvent(viewer, p.id, true);
        check(
          await db
            .from("events")
            .update({ status: p.status })
            .eq("id", p.id)
            .select("id")
            .single(),
        );
        break;
      }
      case "availability": {
        const p = z
          .object({
            event_id: uuid,
            player_id: uuid,
            response: z.enum(["yes", "no", "maybe"]),
            reason: optionalText(500),
          })
          .parse(data);
        await requireParticipation(viewer, p.event_id, p.player_id, false);
        check(await db.from("availability").upsert(p));
        break;
      }
      case "attendance": {
        const p = z
          .object({
            event_id: uuid,
            player_id: uuid,
            status: z.enum(["present", "absent", "excused"]),
          })
          .parse(data);
        await requireParticipation(viewer, p.event_id, p.player_id, true);
        check(await db.from("attendance").upsert(p));
        break;
      }
      case "announcement": {
        const p = z
          .object({
            title: text(),
            body: text(10000),
            audience: z.enum(["club", "teams", "people"]),
            teams: selectedIds.default([]),
            recipients: selectedIds.default([]),
            important: z.enum(["true", "false"]),
          })
          .parse(data);
        if (p.audience === "teams" && !p.teams.length)
          throw new Error("Vyberte aspoň jeden tím.");
        if (p.audience === "people" && !p.recipients.length)
          throw new Error("Vyberte aspoň jedného príjemcu.");
        if (p.audience !== "teams") admin();
        else
          await Promise.all(
            p.teams.map((id) => requireManagedTeam(viewer, id)),
          );
        if (data.id)
          await requireManagedAnnouncement(viewer, uuid.parse(data.id));
        const payload = {
          title: p.title,
          body: p.body,
          team_id: p.audience === "teams" ? p.teams[0] : null,
          extra_team_ids: p.audience === "teams" ? p.teams.slice(1) : [],
          recipient_ids: p.audience === "people" ? p.recipients : [],
          important: p.important === "true",
        };
        if (data.id)
          check(
            await db
              .from("announcements")
              .update(payload)
              .eq("id", uuid.parse(data.id))
              .select("id")
              .single(),
          );
        else
          check(
            await db
              .from("announcements")
              .insert({ ...payload, author_id: viewer.id }),
          );
        break;
      }
      case "archive-announcement": {
        await requireManagedAnnouncement(viewer, uuid.parse(data.id));
        check(
          await db
            .from("announcements")
            .update({ archived: true })
            .eq("id", uuid.parse(data.id))
            .select("id")
            .single(),
        );
        break;
      }
      case "fee-plan": {
        admin();
        const p = z
          .object({ name: text(120), amount_cents: amount })
          .parse(data);
        if (data.id)
          check(
            await db
              .from("fee_plans")
              .update(p)
              .eq("id", uuid.parse(data.id))
              .select("id")
              .single(),
          );
        else check(await db.from("fee_plans").insert(p));
        break;
      }
      case "archive-fee-plan": {
        admin();
        const archived =
          z.enum(["true", "false"]).parse(data.archived) === "true";
        check(
          await db
            .from("fee_plans")
            .update({ archived })
            .eq("id", uuid.parse(data.id))
            .select("id")
            .single(),
        );
        break;
      }
      case "charge": {
        admin();
        const p = z
          .object({
            player_id: uuid,
            plan_id: z.union([uuid, z.literal("")]),
            label: text(160),
            amount_cents: amount,
            due_date: z.iso.date(),
          })
          .parse(data);
        check(
          await db.from("charges").insert({
            ...p,
            ...feePeriodSchema.parse(data),
            plan_id: p.plan_id || null,
          }),
        );
        break;
      }
      case "adjust-charge": {
        admin();
        const p = z
          .object({
            charge_id: uuid,
            new_total_cents: z
              .string()
              .regex(/^\d+(?:[.,]\d{1,2})?$/)
              .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
              .pipe(z.number().int().min(0).max(100000000)),
            note: text(500),
          })
          .parse(data);
        check(await db.from("charge_adjustments").insert(p));
        break;
      }
      case "payment": {
        admin();
        const p = z
          .object({ charge_id: uuid, amount_cents: amount, note: text(500) })
          .parse(data);
        check(await db.from("payments").insert(p));
        break;
      }
      case "reverse-payment": {
        admin();
        const id = uuid.parse(data.id);
        const note = text(500).parse(data.note);
        const { data: p, error } = await db
          .from("payments")
          .select("id,charge_id,amount_cents")
          .eq("id", id)
          .single();
        check({ error });
        if (!p || p.amount_cents <= 0)
          throw new Error("Platbu nie je možné stornovať.");
        check(
          await db.from("payments").insert({
            charge_id: p.charge_id,
            amount_cents: -p.amount_cents,
            reverses_id: p.id,
            note,
          }),
        );
        break;
      }
      case "read-notification": {
        check(
          await db
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("id", uuid.parse(data.id))
            .eq("recipient_id", viewer.id)
            .select("id")
            .single(),
        );
        break;
      }
      case "send-reminders": {
        await requireEvent(viewer, uuid.parse(data.event_id), true);
        const result = await db.rpc("send_event_reminders", {
          p_event: uuid.parse(data.event_id),
        });
        check(result);
        revalidatePath("/klub", "layout");
        return {
          success: `Vytvorené pripomienky: ${result.data ?? 0}. Platí pre udalosti v najbližších 48 hodinách; duplicitné pripomienky sa neposielajú.`,
        };
      }
      case "settings": {
        admin();
        const p = z
          .object({
            name: text(100),
            email: z.union([z.email(), z.literal("")]),
            phone: optionalText(40),
            venue: optionalText(200),
            logo_url: z.union([
              z.url().refine((v) => v.startsWith("https://")),
              z.literal(""),
            ]),
            categories: categoriesSchema,
          })
          .parse(data);
        check(
          await db
            .from("club_settings")
            .update({
              ...p,
              logo_url: p.logo_url || null,
            })
            .eq("id", true)
            .select("id")
            .single(),
        );
        break;
      }
      case "profile": {
        const p = z
          .object({ full_name: text(120), phone: optionalText(40) })
          .parse(data);
        check(
          await db.rpc("update_own_profile", {
            p_name: p.full_name,
            p_phone: p.phone,
          }),
        );
        break;
      }
      default:
        return { error: "Neznáma operácia." };
    }
    revalidatePath("/klub", "layout");
    return { success: "Zmena bola uložená." };
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        error: "Skontrolujte označené údaje a skúste to znova.",
        fieldErrors: Object.fromEntries(
          error.issues.map((i) => [
            String(i.path[0] || "form"),
            "Skontrolujte formát, povinnú hodnotu a povolenú dĺžku.",
          ]),
        ),
      };
    return {
      error:
        error instanceof Error ? error.message : "Zmenu sa nepodarilo uložiť.",
    };
  }
}
