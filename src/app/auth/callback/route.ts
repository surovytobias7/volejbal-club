import { NextResponse } from "next/server";
import { database } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next =
    url.searchParams.get("next") === "/nove-heslo" ? "/nove-heslo" : "/klub";
  if (code) {
    const db = await database();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, appUrl()));
  }
  return NextResponse.redirect(
    new URL("/prihlasenie?status=expired", appUrl()),
  );
}
