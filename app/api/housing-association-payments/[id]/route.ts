import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured, first } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";
import { calculateHousingAssociationPaymentStatus } from "@/lib/payment-status";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "finance"]);
  if (auth.response) return auth.response;
  const agencyId = await getAgencyId();
  if (!agencyId) return NextResponse.json({ error: "Managing Agent context is required." }, { status: 400 });
  const { id } = await context.params;
  const input = await request.json().catch(() => ({}));
  const current = await first<any>("select * from housing_association_payments where id = $1 and agency_id = $2", [id, agencyId]);
  if (!current) return NextResponse.json({ error: "Payment record was not found for this Managing Agent." }, { status: 404 });

  const status = calculateHousingAssociationPaymentStatus({
    expectedAmount: input.expectedAmount ?? current.expected_amount,
    amountPaid: input.amountPaid ?? current.amount_paid,
    dueDate: input.dueDate ?? current.due_date,
    manualStatus: input.paymentStatus,
  });

  const updated = await first(
    `update housing_association_payments
     set expected_amount = coalesce($3, expected_amount),
         amount_paid = coalesce($4, amount_paid),
         due_date = $5,
         paid_date = $6,
         payment_reference = $7,
         notes = $8,
         payment_status = $9,
         updated_by_user_id = $10,
         updated_at = now()
     where id = $1 and agency_id = $2
     returning *`,
    [
      id,
      agencyId,
      input.expectedAmount === undefined ? null : Number(input.expectedAmount),
      input.amountPaid === undefined ? null : Number(input.amountPaid),
      input.dueDate || current.due_date || null,
      input.paidDate || null,
      input.paymentReference || null,
      input.notes || null,
      status,
      auth.session?.staffId,
    ],
  );

  return NextResponse.json(updated);
}
