import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { first, query } from "@/lib/db";
import type { StaffRole } from "@/lib/erp-repository";

const cookieName = "realtyos_session";
const maxAgeSeconds = 60 * 60 * 12;
const defaultOwnerAdminEmails = ["aesha.akhtar@uksupporthousing.co.uk", "admin@uksupporthousing.co.uk"];

export type AuthSession = {
  token: string;
  staffId: string;
  agencyId: string;
  role: StaffRole;
  name: string;
  email: string;
};

type SessionPayload = AuthSession & { exp: number };

type SessionRow = {
  staff_id: string;
  agency_id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  expires_at: string;
  revoked_at: string | null;
};

function authSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.DATABASE_URL || "realtyos-development-secret";
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeSession(payload: SessionPayload) {
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${value}.${sign(value)}`;
}

function decodeSession(raw?: string): SessionPayload | null {
  if (!raw) return null;
  const [value, signature] = raw.split(".");
  if (!value || !signature || !constantTimeEqual(sign(value), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.token || !payload.staffId || !payload.agencyId || !payload.role || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createStaffSession(user: { id: string; agency_id: string; full_name: string; email: string; role: StaffRole }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

  await query(
    `insert into staff_sessions (staff_id, agency_id, token_hash, expires_at)
     values ($1, $2, $3, $4)`,
    [user.id, user.agency_id, tokenHash(token), expiresAt],
  );

  const cookieStore = await cookies();
  cookieStore.set(
    cookieName,
    encodeSession({
      token,
      staffId: user.id,
      agencyId: user.agency_id,
      role: user.role,
      name: user.full_name,
      email: user.email,
      exp: expiresAt.getTime(),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.AUTH_COOKIE_SECURE === "true",
      path: "/",
      maxAge: maxAgeSeconds,
    },
  );
}

export async function destroyStaffSession() {
  const cookieStore = await cookies();
  const payload = decodeSession(cookieStore.get(cookieName)?.value);
  if (payload) {
    await query("update staff_sessions set revoked_at = now() where token_hash = $1", [tokenHash(payload.token)]);
  }
  cookieStore.delete(cookieName);
}

export async function getStaffSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const payload = decodeSession(cookieStore.get(cookieName)?.value);
  if (!payload) return null;

  const row = await first<SessionRow>(
    `select s.staff_id, s.agency_id, u.full_name, u.email, u.role, u.active, s.expires_at, s.revoked_at
     from staff_sessions s
     join staff_users u on u.id = s.staff_id and u.agency_id = s.agency_id
     where s.token_hash = $1`,
    [tokenHash(payload.token)],
  );

  if (!row || !row.active || row.revoked_at || new Date(row.expires_at).getTime() < Date.now()) {
    return null;
  }

  return {
    token: payload.token,
    staffId: row.staff_id,
    agencyId: row.agency_id,
    role: row.role,
    name: row.full_name,
    email: row.email,
  };
}

export function unauthorized() {
  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
}

export async function requireStaffSession(allowedRoles?: StaffRole[]) {
  const session = await getStaffSession();
  if (!session) return { response: unauthorized(), session: null };
  if (allowedRoles && !allowedRoles.includes(session.role)) return { response: forbidden(), session: null };
  return { response: null, session };
}

export function ownerAdminEmails() {
  const configured = process.env.OWNER_ADMIN_EMAILS || process.env.OWNER_ADMIN_EMAIL;
  return [...defaultOwnerAdminEmails, ...(configured ? configured.split(",") : [])].map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export function ownerAdminEmail() {
  return ownerAdminEmails()[0] ?? defaultOwnerAdminEmails[0];
}

export async function requireOwnerAdmin() {
  const auth = await requireStaffSession(["admin"]);
  if (auth.response) return auth;

  if (!auth.session || !ownerAdminEmails().includes(auth.session.email.toLowerCase())) {
    return { response: forbidden(), session: null };
  }

  return auth;
}
