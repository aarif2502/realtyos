import type { QueryResultRow } from "pg";

export type CubeMetric = "occupancy" | "arrears" | "rent" | "risk" | "referrals" | "support" | "maintenance";
export type CubeDimension = "property" | "localAuthority" | "risk" | "status" | "month";

type Snapshot = {
  properties?: QueryResultRow[];
  rooms?: QueryResultRow[];
  tenants?: QueryResultRow[];
  ledger?: QueryResultRow[];
  referrals?: QueryResultRow[];
  supportNotes?: QueryResultRow[];
  maintenanceJobs?: QueryResultRow[];
  incidents?: QueryResultRow[];
};

function monthOf(value?: string | Date | null) {
  if (!value) return "No date";
  return new Date(value).toISOString().slice(0, 7);
}

function groupLabel(snapshot: Snapshot, dimension: CubeDimension, row: QueryResultRow) {
  if (dimension === "property") {
    const propertyId = row.property_id || row.id;
    return snapshot.properties?.find((property) => property.id === propertyId)?.address || "No property";
  }
  if (dimension === "localAuthority") {
    const propertyId = row.property_id || row.id;
    const property = snapshot.properties?.find((item) => item.id === propertyId);
    return property?.local_authority || "No local authority";
  }
  if (dimension === "risk") return row.risk_assessment || row.risk_level || row.severity || "No risk";
  if (dimension === "status") return row.status || row.record_status || "No status";
  return monthOf(row.created_at || row.entry_date || row.reported_at || row.week_start);
}

function add(groups: Map<string, number>, key: string, amount = 1) {
  groups.set(key, (groups.get(key) || 0) + amount);
}

export function buildCube(snapshot: Snapshot, metric: CubeMetric, dimension: CubeDimension) {
  const groups = new Map<string, number>();

  if (metric === "occupancy") {
    for (const property of snapshot.properties || []) {
      const rooms = (snapshot.rooms || []).filter((room) => room.property_id === property.id);
      const occupied = rooms.filter((room) => room.status === "occupied").length;
      const value = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
      add(groups, groupLabel(snapshot, dimension, property), value);
    }
  }

  if (metric === "arrears") {
    for (const entry of snapshot.ledger || []) {
      if (entry.status === "void") continue;
      add(groups, groupLabel(snapshot, dimension, entry), Number(entry.debit || 0) - Number(entry.credit || 0));
    }
  }

  if (metric === "rent") {
    for (const room of snapshot.rooms || []) {
      if (room.status === "occupied") add(groups, groupLabel(snapshot, dimension, room), Number(room.weekly_rent || 0));
    }
  }

  if (metric === "risk") {
    for (const tenant of snapshot.tenants || []) {
      if (tenant.risk_assessment === "HIGH" || tenant.risk_assessment === "MEDIUM") add(groups, groupLabel(snapshot, dimension, tenant));
    }
  }

  if (metric === "referrals") {
    for (const referral of snapshot.referrals || []) add(groups, groupLabel(snapshot, dimension, referral));
  }

  if (metric === "support") {
    for (const note of snapshot.supportNotes || []) add(groups, groupLabel(snapshot, dimension, note));
  }

  if (metric === "maintenance") {
    for (const job of snapshot.maintenanceJobs || []) add(groups, groupLabel(snapshot, dimension, job), Number(job.cost || 0) || 1);
  }

  return [...groups.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 30);
}

export function ruleBasedInsights(snapshot: Snapshot) {
  const insights: Array<{ title: string; detail: string; priority: "high" | "medium" | "low"; action: string }> = [];
  const rooms = snapshot.rooms || [];
  const tenants = snapshot.tenants || [];
  const ledger = snapshot.ledger || [];
  const arrears = ledger.reduce((sum, row) => sum + Number(row.debit || 0) - Number(row.credit || 0), 0);
  const voidRooms = rooms.filter((room) => room.status !== "occupied");
  const highRisk = tenants.filter((tenant) => tenant.risk_assessment === "HIGH");
  const openReferrals = (snapshot.referrals || []).filter((referral) => !["rejected", "converted"].includes(referral.status));
  const openMaintenance = (snapshot.maintenanceJobs || []).filter((job) => !["complete", "cancelled"].includes(job.status));

  if (arrears > 0) insights.push({ title: "Rent arrears detected", detail: `Current net arrears are ${Math.round(arrears)}.`, priority: "high", action: "Create arrears tasks and review HB/UC claims." });
  if (voidRooms.length) insights.push({ title: "Void rooms available", detail: `${voidRooms.length} rooms are not occupied.`, priority: "medium", action: "Review referrals and room readiness." });
  if (highRisk.length) insights.push({ title: "High-risk tenant reviews", detail: `${highRisk.length} tenants are marked high risk.`, priority: "high", action: "Check support plans and risk review dates." });
  if (openReferrals.length) insights.push({ title: "Referral pipeline active", detail: `${openReferrals.length} referrals need progression.`, priority: "medium", action: "Follow up referrers and screening decisions." });
  if (openMaintenance.length) insights.push({ title: "Open maintenance work", detail: `${openMaintenance.length} maintenance jobs remain open.`, priority: "medium", action: "Assign owners and update target dates." });
  if (!insights.length) insights.push({ title: "No urgent exceptions", detail: "No major arrears, high-risk or maintenance exceptions were detected.", priority: "low", action: "Continue routine monitoring." });
  return insights;
}
