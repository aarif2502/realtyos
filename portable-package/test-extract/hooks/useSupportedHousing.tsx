"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ComplianceItem,
  HousingBenefitClaim,
  SupportedHousingState,
  SupportedHousingSummary,
  SupportedIncident,
  SupportedReferral,
  SupportedResident,
  SupportedTask,
} from "@/lib/supported-housing-store";

type ApiState = SupportedHousingState & { summary: SupportedHousingSummary };
type CollectionName = keyof SupportedHousingState;
type CollectionRecord =
  | SupportedResident
  | SupportedReferral
  | SupportedIncident
  | SupportedTask
  | HousingBenefitClaim
  | ComplianceItem
  | SupportedHousingState["properties"][number];

const emptySummary: SupportedHousingSummary = {
  residents: 0,
  occupancyRate: 0,
  openIncidents: 0,
  highRiskResidents: 0,
  arrearsTotal: 0,
  weeklyHousingBenefit: 0,
  voids: 0,
  expiringCompliance: 0,
  pendingReferrals: 0,
};

const emptyState: ApiState = {
  residents: [],
  referrals: [],
  properties: [],
  incidents: [],
  tasks: [],
  claims: [],
  compliance: [],
  summary: emptySummary,
};

function fullName(row: Record<string, unknown>) {
  return [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" ");
}

function normalizeSnapshot(raw: Record<string, unknown>): ApiState {
  const tenants = Array.isArray(raw.tenants) ? (raw.tenants as Array<Record<string, unknown>>) : [];
  const properties = Array.isArray(raw.properties) ? (raw.properties as Array<Record<string, unknown>>) : [];
  const rooms = Array.isArray(raw.rooms) ? (raw.rooms as Array<Record<string, unknown>>) : [];
  const incidents = Array.isArray(raw.incidents) ? (raw.incidents as Array<Record<string, unknown>>) : [];
  const claims = Array.isArray(raw.claims) ? (raw.claims as Array<Record<string, unknown>>) : [];

  return {
    residents: tenants.map((tenant) => ({
      id: String(tenant.id),
      name: fullName(tenant),
      age: Number(tenant.age ?? 0),
      property: String(properties.find((property) => property.id === tenant.property_id)?.address ?? "Unassigned property"),
      room: String(rooms.find((room) => room.id === tenant.room_id)?.room_label ?? ""),
      referralSource: String(tenant.referral_agency ?? ""),
      moveIn: String(tenant.checkin_date ?? ""),
      riskLevel: String(tenant.risk_assessment ?? "LOW").toUpperCase() === "HIGH" ? "High" : String(tenant.risk_assessment ?? "LOW").toUpperCase() === "MEDIUM" ? "Medium" : "Low",
      status: tenant.checkout_date ? "Closed" : "Active",
      supportWorker: "Unassigned",
      weeklyRent: Number(rooms.find((room) => room.id === tenant.room_id)?.weekly_rent ?? 0),
      arrears: 0,
      nextReview: "",
      supportGoals: [String(tenant.length_of_stay ?? "ONGOING"), String(tenant.record_status ?? "Imported")].filter(Boolean),
    })),
    referrals: [],
    properties: properties.map((property) => ({
      id: String(property.id),
      name: String(property.address),
      localAuthority: String(property.local_authority ?? ""),
      units: Number(property.total_rooms ?? 0),
      occupied: rooms.filter((room) => room.property_id === property.id && room.status === "occupied").length,
      voids: rooms.filter((room) => room.property_id === property.id && room.status !== "occupied").length,
      weeklyCharge: Number(rooms.find((room) => room.property_id === property.id)?.weekly_rent ?? 0),
      complianceScore: 0,
      housingOfficer: "",
    })),
    incidents: incidents.map((incident) => ({
      id: String(incident.id),
      resident: String(tenants.find((tenant) => tenant.id === incident.tenant_id) ? fullName(tenants.find((tenant) => tenant.id === incident.tenant_id) as Record<string, unknown>) : "Unassigned tenant"),
      property: String(properties.find((property) => property.id === incident.property_id)?.address ?? "Unassigned property"),
      category: String(incident.category),
      severity: String(incident.severity ?? "LOW").toUpperCase() === "HIGH" ? "High" : String(incident.severity ?? "LOW").toUpperCase() === "MEDIUM" ? "Medium" : "Low",
      status: incident.status === "closed" ? "Closed" : incident.status === "action_plan" ? "Action Plan" : "Open",
      reportedAt: String(incident.reported_at ?? ""),
      owner: "",
      summary: String(incident.summary ?? ""),
    })),
    tasks: [],
    claims: claims.map((claim) => ({
      id: String(claim.id),
      resident: String(tenants.find((tenant) => tenant.id === claim.tenant_id) ? fullName(tenants.find((tenant) => tenant.id === claim.tenant_id) as Record<string, unknown>) : ""),
      property: "",
      period: String(claim.period ?? ""),
      amount: Number(claim.amount ?? 0),
      status: claim.status === "paid" ? "Paid" : claim.status === "submitted" || claim.status === "rejected" ? "Submitted" : "Evidence Required",
      submitted: Boolean(claim.submitted_at),
    })),
    compliance: [],
    summary: (raw.summary as SupportedHousingSummary | undefined) ?? emptySummary,
  };
}

export function useSupportedHousing() {
  const [data, setData] = useState<ApiState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/erp", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load supported housing data");
      }

      const payload = (await response.json()) as Record<string, unknown>;
      setData(normalizeSnapshot(payload));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load supported housing data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createRecord = useCallback(
    async <T extends CollectionRecord>(collection: CollectionName, payload: Partial<T>) => {
      setSaving(true);
      setError(null);

      try {
        const erpCollection =
          collection === "residents" ? "tenants" : collection === "tasks" ? "supportNotes" : collection;
        const outbound =
          collection === "residents"
            ? {
                firstName: String((payload as Record<string, unknown>).name ?? "").split(" ")[0] || "Unknown",
                lastName: String((payload as Record<string, unknown>).name ?? "").split(" ").slice(1).join(" ") || "Tenant",
                propertyAddress: (payload as Record<string, unknown>).property,
                dateOfBirth: null,
                checkinDate: (payload as Record<string, unknown>).moveIn,
                referralAgency: (payload as Record<string, unknown>).referralSource,
                age: (payload as Record<string, unknown>).age,
                riskAssessment: String((payload as Record<string, unknown>).riskLevel ?? "LOW").toUpperCase(),
                lengthOfStay: "ONGOING",
                recordStatus: "Manual entry",
              }
            : collection === "incidents"
              ? {
                  category: (payload as Record<string, unknown>).category,
                  severity: String((payload as Record<string, unknown>).severity ?? "LOW").toUpperCase(),
                  summary: (payload as Record<string, unknown>).summary,
                }
              : payload;
        const response = await fetch(`/api/erp/${erpCollection}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(outbound),
        });

        if (!response.ok) {
          throw new Error("Unable to save record");
        }

        await refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to save record");
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const updateRecord = useCallback(
    async <T extends CollectionRecord>(collection: CollectionName, payload: Partial<T> & { id: string }) => {
      setSaving(true);
      setError(null);

      try {
        const erpCollection = collection === "tasks" ? "supportNotes" : collection;
        const response = await fetch(`/api/erp/${erpCollection}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Unable to update record");
        }

        await refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update record");
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const overdueTasks = useMemo(() => data.tasks.filter((task) => task.status !== "Done"), [data.tasks]);

  return {
    ...data,
    overdueTasks,
    loading,
    saving,
    error,
    refresh,
    createRecord,
    updateRecord,
  };
}
