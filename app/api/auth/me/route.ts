import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { first } from "@/lib/db";

export async function GET() {
  const session = await getStaffSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const agency = await first<{ name?: string; trading_name?: string | null }>(
    "select name, trading_name from agencies where id = $1",
    [session.agencyId],
  );

  return NextResponse.json({
    staff: {
      id: session.staffId,
      agencyId: session.agencyId,
      agencyName: agency?.name ?? null,
      agencyLabel: agency?.trading_name || agency?.name || null,
      fullName: session.name,
      email: session.email,
      role: session.role,
      homeAgencyId: session.homeAgencyId,
      forcePasswordChange: session.forcePasswordChange,
      platformAdmin: session.role === "platform_admin",
      ownerAdmin: session.role === "platform_admin" || session.role === "admin",
    },
  });
}
