import { NextResponse } from "next/server";
import { getStaffSession, requireStaffSession, tokenHash } from "@/lib/auth";
import { databaseConfigured, first, query } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export const runtime = "nodejs";

function validatePassword(value: string) {
  if (value.length < 10) return "New password must be at least 10 characters.";
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return "New password must include uppercase, lowercase, number and symbol characters.";
  }
  return null;
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  const auth = await requireStaffSession();
  if (auth.response) return auth.response;

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Current password, new password and confirmation are required." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "New password and confirmation do not match." }, { status: 400 });
  }
  const strengthError = validatePassword(newPassword);
  if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

  const user = await first<{ password_hash: string }>("select password_hash from staff_users where id = $1 and active = true", [session.staffId]);
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    return NextResponse.json({ error: "Current password is not correct." }, { status: 403 });
  }

  await query(
    `update staff_users
     set password_hash = $2,
         password_updated_at = now(),
         force_password_change = false
     where id = $1`,
    [session.staffId, hashPassword(newPassword)],
  );
  await query("update staff_sessions set revoked_at = now() where staff_id = $1 and token_hash <> $2 and revoked_at is null", [session.staffId, tokenHash(session.token)]);

  return NextResponse.json({ ok: true });
}
