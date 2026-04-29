import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { getErpSnapshot } from "@/lib/erp-repository";
import { ruleBasedInsights } from "@/lib/reporting";

export const runtime = "nodejs";

type Row = Record<string, any>;

function month(value?: string | null) {
  if (!value) return "No date";
  return new Date(value).toISOString().slice(0, 7);
}

function daysBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

function groupBy<T>(items: T[], keyer: (item: T) => string) {
  return items.reduce((map, item) => {
    const key = keyer(item);
    const current = map.get(key) || [];
    current.push(item);
    map.set(key, current);
    return map;
  }, new Map<string, T[]>());
}

function moneyRows(snapshot: Row) {
  const properties = snapshot.properties || [];
  const rooms = snapshot.rooms || [];
  const ledger = (snapshot.ledger || []).filter((entry: Row) => entry.status !== "void");
  const tenants = snapshot.tenants || [];
  const referrals = snapshot.referrals || [];
  const incidents = snapshot.incidents || [];
  const maintenance = snapshot.maintenanceJobs || [];
  const expenses = snapshot.expenses || [];

  const propertyRows = properties.map((property: Row) => {
    const propertyRooms = rooms.filter((room: Row) => room.property_id === property.id);
    const occupied = propertyRooms.filter((room: Row) => room.status === "occupied").length;
    const rent = propertyRooms.filter((room: Row) => room.status === "occupied").reduce((sum: number, room: Row) => sum + Number(room.weekly_rent || 0), 0);
    const propertyLedger = ledger.filter((entry: Row) => entry.property_id === property.id);
    const due = propertyLedger.reduce((sum: number, entry: Row) => sum + Number(entry.debit || 0), 0);
    const collected = propertyLedger.reduce((sum: number, entry: Row) => sum + Number(entry.credit || 0), 0);
    const propertyExpenses = expenses.filter((expense: Row) => expense.property_id === property.id).reduce((sum: number, expense: Row) => sum + Number(expense.amount || 0), 0);
    const openIssues = incidents.filter((incident: Row) => incident.property_id === property.id && incident.status !== "closed").length + maintenance.filter((job: Row) => job.property_id === property.id && !["complete", "cancelled"].includes(job.status)).length;
    return {
      id: property.id,
      property: property.address,
      region: property.local_authority || "No region",
      landlordId: property.landlord_id || "Unassigned",
      rooms: propertyRooms.length,
      occupied,
      occupancyRate: propertyRooms.length ? Math.round((occupied / propertyRooms.length) * 100) : 0,
      revenue: rent,
      rentDue: due,
      rentCollected: collected,
      arrears: due - collected,
      arrearsPercent: due ? Math.round(((due - collected) / due) * 100) : 0,
      expenses: propertyExpenses,
      roi: propertyExpenses ? Math.round(((rent * 52 - propertyExpenses) / propertyExpenses) * 100) : rent ? 100 : 0,
      issues: openIssues,
      averageVoidDays: propertyRooms.filter((room: Row) => room.status !== "occupied").length ? 14 : 0,
    };
  });

  const tenantRows = tenants.map((tenant: Row) => {
    const notes = (snapshot.supportNotes || []).filter((note: Row) => note.tenant_id === tenant.id);
    const tenantLedger = ledger.filter((entry: Row) => entry.tenant_id === tenant.id);
    const referral = referrals.find((item: Row) => item.tenant_id === tenant.id || item.applicant_name?.toLowerCase() === `${tenant.first_name} ${tenant.last_name}`.toLowerCase());
    const due = tenantLedger.reduce((sum: number, entry: Row) => sum + Number(entry.debit || 0), 0);
    const collected = tenantLedger.reduce((sum: number, entry: Row) => sum + Number(entry.credit || 0), 0);
    const arrears = due - collected;
    const riskWeight = tenant.risk_assessment === "HIGH" ? 45 : tenant.risk_assessment === "MEDIUM" ? 25 : 5;
    const arrearsWeight = arrears > 1000 ? 35 : arrears > 0 ? 15 : 0;
    const supportWeight = notes.length === 0 ? 20 : 0;
    const failed = Boolean(tenant.checkout_date && tenant.record_status !== "completed");
    return {
      id: tenant.id,
      tenant: `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim(),
      propertyId: tenant.property_id,
      supportWorkerId: tenant.support_worker_id || "Unassigned",
      referralSource: referral?.source || referral?.partner_id || tenant.referral_agency || "Unknown",
      tenantType: tenant.record_status || tenant.length_of_stay || "General",
      joinedMonth: month(tenant.checkin_date || tenant.created_at),
      supportSessions: notes.length,
      outcomeScore: Math.min(100, notes.length * 12 + (tenant.risk_assessment === "LOW" ? 20 : 0)),
      riskLevel: tenant.risk_assessment || "Not set",
      arrears,
      arrearsRisk: Math.min(100, riskWeight + arrearsWeight + supportWeight),
      placementFailureRisk: Math.min(100, riskWeight + supportWeight + (failed ? 40 : 0)),
      failed,
    };
  });

  return { propertyRows, tenantRows };
}

export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const auth = await requireStaffSession(["admin", "manager", "housing_officer", "support_worker", "finance", "readonly"]);
  if (auth.response) return auth.response;

  const snapshot = await getErpSnapshot() as Row;
  const { propertyRows, tenantRows } = moneyRows(snapshot);
  const ledger = (snapshot.ledger || []).filter((entry: Row) => entry.status !== "void");
  const rooms = snapshot.rooms || [];
  const maintenance = snapshot.maintenanceJobs || [];
  const expenses = snapshot.expenses || [];
  const notes = snapshot.supportNotes || [];
  const claims = snapshot.claims || [];
  const housingAssociationPayments = snapshot.housingAssociationPayments || [];

  const monthly = [...groupBy(ledger, (entry: Row) => month(entry.entry_date || entry.created_at)).entries()].map(([label, entries]) => ({
    label,
    due: entries.reduce((sum, entry: Row) => sum + Number(entry.debit || 0), 0),
    collected: entries.reduce((sum, entry: Row) => sum + Number(entry.credit || 0), 0),
  })).sort((a, b) => a.label.localeCompare(b.label));

  const supportByMonth = [...groupBy(notes, (note: Row) => month(note.week_start || note.created_at)).entries()].map(([label, rows]) => ({
    label,
    sessions: rows.length,
    improved: rows.filter((note: Row) => note.risk_change === "reduced").length,
  })).sort((a, b) => a.label.localeCompare(b.label));

  const arrearsAging = [
    { label: "0-30 days", value: ledger.filter((entry: Row) => entry.debit && daysBetween(entry.entry_date, new Date().toISOString()) <= 30).reduce((sum: number, entry: Row) => sum + Number(entry.debit || 0) - Number(entry.credit || 0), 0) },
    { label: "30-60 days", value: ledger.filter((entry: Row) => entry.debit && daysBetween(entry.entry_date, new Date().toISOString()) > 30 && daysBetween(entry.entry_date, new Date().toISOString()) <= 60).reduce((sum: number, entry: Row) => sum + Number(entry.debit || 0) - Number(entry.credit || 0), 0) },
    { label: "60+ days", value: ledger.filter((entry: Row) => entry.debit && daysBetween(entry.entry_date, new Date().toISOString()) > 60).reduce((sum: number, entry: Row) => sum + Number(entry.debit || 0) - Number(entry.credit || 0), 0) },
  ];

  const totalRentDue = ledger.reduce((sum: number, entry: Row) => sum + Number(entry.debit || 0), 0);
  const totalCollected = ledger.reduce((sum: number, entry: Row) => sum + Number(entry.credit || 0), 0);
  const occupied = rooms.filter((room: Row) => room.status === "occupied").length;
  const occupancyRate = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const openMaintenance = maintenance.filter((job: Row) => !["complete", "cancelled"].includes(job.status));
  const totalExpenses = expenses.reduce((sum: number, entry: Row) => sum + Number(entry.amount || 0), 0);
  const activeTenants = tenantRows.filter((tenant: Row) => !tenant.failed).length || 1;

  const role = auth.session!.role;
  const restricted = role === "support_worker" || role === "readonly";

  return NextResponse.json({
    role,
    dashboards: {
      portfolio: {
        kpis: {
          occupancyRate,
          revenue: propertyRows.reduce((sum: number, row: Row) => sum + row.revenue, 0),
          arrearsPercent: totalRentDue ? Math.round(((totalRentDue - totalCollected) / totalRentDue) * 100) : 0,
          averageVoidPeriod: propertyRows.length ? Math.round(propertyRows.reduce((sum: number, row: Row) => sum + row.averageVoidDays, 0) / propertyRows.length) : 0,
        },
        rows: restricted ? [] : propertyRows,
      },
      support: {
        kpis: {
          sessions: notes.length,
          averageSessionsPerTenant: Math.round((notes.length / activeTenants) * 10) / 10,
          outcomeImprovements: notes.filter((note: Row) => note.risk_change === "reduced").length,
          failedTenancies: tenantRows.filter((tenant: Row) => tenant.failed).length,
        },
        rows: tenantRows,
      },
      finance: {
        kpis: {
          totalRentDue,
          totalCollected,
          arrears: totalRentDue - totalCollected,
          hbUcDelays: claims.filter((claim: Row) => claim.status !== "paid").length,
          pendingCyclePayments: housingAssociationPayments.filter((payment: Row) => payment.payment_status === "pending").length,
          missedCyclePayments: housingAssociationPayments.filter((payment: Row) => payment.payment_status === "missed").length,
          completedCyclePayments: housingAssociationPayments.filter((payment: Row) => payment.payment_status === "completed").length,
        },
        arrearsAging,
        monthly,
        cyclePayments: housingAssociationPayments,
      },
      operations: {
        kpis: {
          timeToFillVoids: 14,
          maintenanceResponseDays: openMaintenance.length ? 3 : 0,
          staffWorkload: notes.length,
          costPerTenant: Math.round(totalExpenses / activeTenants),
        },
        maintenance: openMaintenance,
      },
    },
    trends: { monthly, supportByMonth },
    predictive: {
      arrearsRisk: tenantRows.sort((a: Row, b: Row) => b.arrearsRisk - a.arrearsRisk).slice(0, 10),
      placementFailureRisk: tenantRows.sort((a: Row, b: Row) => b.placementFailureRisk - a.placementFailureRisk).slice(0, 10),
      occupancyForecast: Math.min(100, Math.max(0, occupancyRate + (propertyRows.some((row: Row) => row.averageVoidDays > 0) ? -3 : 2))),
    },
    drilldown: {
      regions: [...new Set(propertyRows.map((row: Row) => row.region))].map((region) => ({
        region,
        properties: propertyRows.filter((row: Row) => row.region === region).map((property: Row) => ({
          ...property,
          tenants: tenantRows.filter((tenant: Row) => tenant.propertyId === property.id),
        })),
      })),
    },
    external: {
      councilSummary: {
        activeTenants,
        supportSessions: notes.length,
        highRiskTenants: tenantRows.filter((tenant: Row) => tenant.riskLevel === "HIGH").length,
        outcomeImprovements: notes.filter((note: Row) => note.risk_change === "reduced").length,
      },
      investorSummary: {
        occupancyRate,
        revenue: propertyRows.reduce((sum: number, row: Row) => sum + row.revenue, 0),
        roiLeaders: propertyRows.sort((a: Row, b: Row) => b.roi - a.roi).slice(0, 5),
      },
    },
    alerts: ruleBasedInsights(snapshot),
  });
}
