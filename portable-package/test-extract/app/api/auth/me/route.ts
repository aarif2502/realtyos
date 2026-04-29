import { NextResponse } from "next/server";
import { getStaffSession, ownerAdminEmails } from "@/lib/auth";

export async function GET() {
  const session = await getStaffSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json({
    staff: {
      id: session.staffId,
      agencyId: session.agencyId,
      fullName: session.name,
      email: session.email,
      role: session.role,
      ownerAdmin: session.role === "admin" && ownerAdminEmails().includes(session.email.toLowerCase()),
    },
  });
}
