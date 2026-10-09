import { NextResponse } from "next/server";
import { database } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (token_hash && (type === "invite" || type === "recovery")) {
    const db = await database();
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL("/nove-heslo", appUrl()));
  }
  return NextResponse.redirect(
    new URL("/prihlasenie?status=expired", appUrl()),
  );
}
