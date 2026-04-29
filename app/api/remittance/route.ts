import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured, first, getPool, query } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";

export const runtime = "nodejs";

function clean(value: unknown) {
  const text = value == null ? "" : String(value).trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function normalizedAddress(value: unknown) {
  return clean(value)
    .toUpperCase()
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function money(value: unknown) {
  const numeric = Number(String(value ?? "0").replace(/[\u00a3,\s]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

function dateOrNull(value: unknown) {
  const text = clean(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

async function agencyIdOrThrow() {
  const agencyId = await getAgencyId();
  if (!agencyId) throw new Error("Managing Agent context is required.");
  return agencyId;
}

async function matchProperty(agencyId: string, address: string) {
  const norm = normalizedAddress(address);
  const result = await query<{ id: string; landlord_id: string | null; address: string }>("select id, landlord_id, address from properties where agency_id = $1", [agencyId]);
  return result.rows.find((row) => normalizedAddress(row.address) === norm) || null;
}

async function activeRate(agencyId: string, propertyId: string | null, atDate?: string | null) {
  if (!propertyId) return null;
  return first<{ id: string; landlord_id: string | null; rate_amount: string; rate_frequency: string }>(
    `select id, landlord_id, rate_amount, rate_frequency
     from landlord_payment_rates
     where agency_id = $1
       and property_id = $2
       and status = 'active'
       and effective_from <= coalesce($3::date, current_date)
       and (effective_to is null or effective_to >= coalesce($3::date, current_date))
     order by effective_from desc
     limit 1`,
    [agencyId, propertyId, atDate || null],
  );
}

function calculatedDue(rate: { rate_amount: string; rate_frequency: string } | null) {
  if (!rate) return 0;
  return money(rate.rate_amount);
}

export async function GET(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "finance", "housing_officer", "readonly"]);
  if (auth.response) return auth.response;
  const agencyId = await agencyIdOrThrow();
  const url = new URL(request.url);
  const search = clean(url.searchParams.get("search"));
  const month = clean(url.searchParams.get("month"));
  const params: unknown[] = [agencyId];
  const filters = ["rli.agency_id = $1"];
  if (search) {
    params.push(`%${search}%`);
    filters.push(`(rli.raw_property_address ilike $${params.length} or p.address ilike $${params.length})`);
  }
  if (month) {
    params.push(`${month}%`);
    filters.push(`coalesce(rli.payment_period_start::text, rb.remittance_month, '') like $${params.length}`);
  }
  const lines = await query(
    `select rli.*, rb.source_file_name, rb.remittance_month, p.address as property_address, l.name as landlord_name,
            lpo.id as obligation_id, lpo.calculated_payment_due, lpo.payment_status, lpo.amount_paid, lpo.payment_reference
     from remittance_line_items rli
     join remittance_batches rb on rb.id = rli.remittance_batch_id and rb.agency_id = rli.agency_id
     left join properties p on p.id = rli.property_id and p.agency_id = rli.agency_id
     left join landlords l on l.id = rli.landlord_id and l.agency_id = rli.agency_id
     left join landlord_payment_obligations lpo on lpo.remittance_line_item_id = rli.id and lpo.agency_id = rli.agency_id and lpo.payment_status <> 'cancelled'
     where ${filters.join(" and ")}
     order by rli.created_at desc
     limit 200`,
    params,
  );
  return NextResponse.json({ lines: lines.rows });
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "finance"]);
  if (auth.response) return auth.response;
  const agencyId = await agencyIdOrThrow();
  const input = await request.json().catch(() => ({}));
  const action = clean(input.action);

  if (action === "rate") {
    const propertyId = clean(input.propertyId);
    if (!propertyId) return NextResponse.json({ error: "Property is required." }, { status: 400 });
    const property = await first("select id from properties where id = $1 and agency_id = $2", [propertyId, agencyId]);
    if (!property) return NextResponse.json({ error: "Property was not found for this Managing Agent." }, { status: 404 });
    const rate = await first(
      `insert into landlord_payment_rates (agency_id, property_id, landlord_id, rate_amount, rate_frequency, effective_from, effective_to, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       returning *`,
      [agencyId, propertyId, clean(input.landlordId) || null, money(input.rateAmount), clean(input.rateFrequency) || "monthly", dateOrNull(input.effectiveFrom) || new Date().toISOString().slice(0, 10), dateOrNull(input.effectiveTo), clean(input.notes) || null],
    );
    return NextResponse.json(rate, { status: 201 });
  }

  if (action === "recordPayment") {
    const obligationId = clean(input.obligationId);
    const current = await first<any>("select * from landlord_payment_obligations where id = $1 and agency_id = $2", [obligationId, agencyId]);
    if (!current) return NextResponse.json({ error: "Payment obligation was not found for this Managing Agent." }, { status: 404 });
    if (current.payment_status === "completed") return NextResponse.json({ error: "This obligation is already completed. Duplicate payments are blocked." }, { status: 409 });
    const paid = money(input.amountPaid);
    const due = money(current.calculated_payment_due);
    const status = paid >= due && due > 0 ? "completed" : paid > 0 ? "partial" : clean(input.paymentStatus) || "pending";
    const updated = await first(
      `update landlord_payment_obligations
       set amount_paid = $3, paid_date = $4, payment_reference = $5, payment_method = $6,
           notes = $7, payment_status = $8, paid_by_user_id = $9, updated_at = now()
       where id = $1 and agency_id = $2
       returning *`,
      [obligationId, agencyId, paid, dateOrNull(input.paidDate) || new Date().toISOString().slice(0, 10), clean(input.paymentReference) || null, clean(input.paymentMethod) || "manual_record", clean(input.notes) || null, status, auth.session!.staffId],
    );
    return NextResponse.json(updated);
  }

  const housingAssociationId = clean(input.housingAssociationId) || null;
  const cycleListNumber = clean(input.cycleListNumber) || "manual";
  const sourceFileName = clean(input.sourceFileName) || `manual-remittance-${Date.now()}`;
  const remittanceMonth = clean(input.remittanceMonth) || new Date().toISOString().slice(0, 7);
  const rawLines = Array.isArray(input.lines) ? input.lines : [];
  if (!rawLines.length) return NextResponse.json({ error: "At least one remittance line is required." }, { status: 400 });

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const batch = await client.query<{ id: string }>(
      `insert into remittance_batches (agency_id, housing_association_id, cycle_list_number, remittance_month, source_file_name, source_file_type, total_received_amount, status, imported_by_user_id, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,'validated',$8,$9)
       on conflict (agency_id, housing_association_id, cycle_list_number, source_file_name)
       do update set total_received_amount = excluded.total_received_amount, status = excluded.status, metadata = excluded.metadata, updated_at = now()
       returning id`,
      [agencyId, housingAssociationId, cycleListNumber, remittanceMonth, sourceFileName, clean(input.sourceFileType) || "manual", rawLines.reduce((sum: number, row: any) => sum + money(row.amount || row.netAmount || row.receivedAmount), 0), auth.session!.staffId, JSON.stringify({ source: "manual_or_uploaded_preview" })],
    );
    let imported = 0;
    let needsReview = 0;
    for (const line of rawLines) {
      const address = clean(line.propertyAddress || line.address);
      const property = await matchProperty(agencyId, address);
      const rate = await activeRate(agencyId, property?.id || null, dateOrNull(line.periodEnd));
      const due = calculatedDue(rate);
      const matchStatus = property ? (rate ? "matched" : "needs_review") : "unmatched";
      if (matchStatus !== "matched") needsReview += 1;
      const lineRow = await client.query<{ id: string }>(
        `insert into remittance_line_items (
           remittance_batch_id, agency_id, housing_association_id, cycle_list_number, property_id, landlord_id,
           raw_tenant_name, raw_property_address, normalized_property_address, reference_number,
           payment_period_start, payment_period_end, number_of_days, gross_amount, net_amount,
           match_status, match_confidence, needs_review_reason, metadata
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15,$16,$17,$18)
         on conflict (agency_id, cycle_list_number, reference_number, raw_property_address, payment_period_start, payment_period_end)
         do update set property_id=excluded.property_id, landlord_id=excluded.landlord_id,
                       gross_amount=excluded.gross_amount, net_amount=excluded.net_amount,
                       match_status=excluded.match_status, needs_review_reason=excluded.needs_review_reason,
                       updated_at=now()
         returning id`,
        [
          batch.rows[0].id,
          agencyId,
          housingAssociationId,
          cycleListNumber,
          property?.id || null,
          rate?.landlord_id || property?.landlord_id || null,
          clean(line.tenantName) || null,
          address,
          normalizedAddress(address),
          clean(line.reference) || `${address}:${line.periodStart || ""}:${line.periodEnd || ""}`,
          dateOrNull(line.periodStart),
          dateOrNull(line.periodEnd),
          Number(line.days || 0) || null,
          money(line.amount || line.netAmount || line.receivedAmount),
          matchStatus,
          matchStatus === "matched" ? 95 : property ? 70 : 30,
          !property ? "No matching property for this Managing Agent." : !rate ? "No active landlord payment rate configured for property." : null,
          JSON.stringify({ importedBy: auth.session!.staffId }),
        ],
      );
      if (property && rate) {
        await client.query(
          `insert into landlord_payment_obligations (
             agency_id, remittance_batch_id, remittance_line_item_id, cycle_list_number, property_id, landlord_id,
             received_amount, landlord_rate_amount, calculated_payment_due, due_date, payment_status, metadata
           )
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11)
           on conflict do nothing`,
          [agencyId, batch.rows[0].id, lineRow.rows[0].id, cycleListNumber, property.id, rate.landlord_id || property.landlord_id, money(line.amount || line.netAmount || line.receivedAmount), money(rate.rate_amount), due, dateOrNull(line.dueDate), JSON.stringify({ rateId: rate.id, rateFrequency: rate.rate_frequency })],
        );
      }
      imported += 1;
    }
    await client.query("update remittance_batches set status = $3 where id = $1 and agency_id = $2", [batch.rows[0].id, agencyId, needsReview ? "needs_review" : "imported"]);
    await client.query("commit");
    return NextResponse.json({ batchId: batch.rows[0].id, imported, needsReview }, { status: 201 });
  } catch (error) {
    await client.query("rollback");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import remittance." }, { status: 400 });
  } finally {
    client.release();
  }
}
