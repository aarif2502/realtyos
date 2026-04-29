import { NextResponse } from "next/server";
import { createStaffSession } from "@/lib/auth";
import { databaseConfigured, first } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import type { StaffRole } from "@/lib/erp-repository";

type StaffLoginRow = {
  id: string;
  agency_id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  password_hash: string;
};

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const body = (await request.json()) as { email?: string; password?: string };
  const user = await first<StaffLoginRow>(
    "select id, agency_id, full_name, email, role, password_hash from staff_users where email = lower($1) and active = true",
    [body.email || ""],
  );

  if (!user || !body.password || !verifyPassword(body.password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createStaffSession(user);

  return NextResponse.json({
    staff: {
      id: user.id,
      agencyId: user.agency_id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    },
  });
}
