"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { database } from "@/lib/supabase/server";
import { appUrl, publicEnvironment } from "@/lib/env";
import type { FormState } from "@/components/forms";

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (!publicEnvironment())
    return {
      error:
        "Prihlásenie ešte nie je nakonfigurované. Kontaktujte správcu klubu.",
    };
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1).max(128) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Zadajte platný e-mail a heslo." };
  const db = await database();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      error:
        "Prihlásenie sa nepodarilo. Skontrolujte e-mail a heslo alebo to skúste neskôr.",
    };
  redirect("/klub");
}
export async function logout() {
  const db = await database();
  await db.auth.signOut();
  redirect("/prihlasenie");
}
export async function recover(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  if (!publicEnvironment())
    return { error: "Obnova hesla ešte nie je nakonfigurovaná." };
  const email = z.email().safeParse(form.get("email"));
  if (!email.success) return { error: "Zadajte platný e-mail." };
  const db = await database();
  await db.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${appUrl()}/auth/callback?next=/nove-heslo`,
  });
  return {
    success: "Ak účet existuje, dostanete e-mail s pokynmi na obnovu hesla.",
  };
}
export async function changePassword(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const password = z.string().min(12).max(128).safeParse(form.get("password"));
  if (!password.success) return { error: "Heslo musí mať 12 až 128 znakov." };
  const db = await database();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return {
      error: "Odkaz vypršal. Vyžiadajte si nový odkaz na obnovu hesla.",
    };
  const { error } = await db.auth.updateUser({ password: password.data });
  if (error)
    return { error: "Heslo sa nepodarilo zmeniť. Vyžiadajte si nový odkaz." };
  redirect("/klub");
}
