import seedData from "@/data/supported-housing.json";

export type RiskLevel = "Low" | "Medium" | "High";
export type ResidentStatus = "Active" | "Move-on Ready" | "Closed";
export type ReferralStatus = "New" | "Assessment" | "Awaiting Documents" | "Accepted" | "Declined";
export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type IncidentStatus = "Open" | "Action Plan" | "Closed";
export type TaskStatus = "Pending" | "Due Soon" | "Done";
export type ClaimStatus = "Evidence Required" | "Submitted" | "Paid" | "Rejected";

export type SupportedResident = {
  id: string;
  name: string;
  age: number;
  property: string;
  room: string;
  referralSource: string;
  moveIn: string;
  riskLevel: RiskLevel;
  status: ResidentStatus;
  supportWorker: string;
  weeklyRent: number;
  arrears: number;
  nextReview: string;
  supportGoals: string[];
};

export type SupportedReferral = {
  id: string;
  applicant: string;
  source: string;
  priority: Priority;
  status: ReferralStatus;
  received: string;
  needs: string[];
  assignedTo: string;
};

export type SupportedProperty = {
  id: string;
  name: string;
  localAuthority: string;
  units: number;
  occupied: number;
  voids: number;
  weeklyCharge: number;
  complianceScore: number;
  housingOfficer: string;
};

export type SupportedIncident = {
  id: string;
  resident: string;
  property: string;
  category: string;
  severity: Exclude<Priority, "Urgent">;
  status: IncidentStatus;
  reportedAt: string;
  owner: string;
  summary: string;
};

export type SupportedTask = {
  id: string;
  title: string;
  owner: string;
  due: string;
  area: "Support" | "Compliance" | "Finance" | "Housing";
  status: TaskStatus;
};

export type HousingBenefitClaim = {
  id: string;
  resident: string;
  property: string;
  period: string;
  amount: number;
  status: ClaimStatus;
  submitted: boolean;
};

export type ComplianceItem = {
  id: string;
  property: string;
  item: string;
  expiry: string;
  status: "Valid" | "Expiring" | "Expired";
};

export type SupportedHousingState = {
  residents: SupportedResident[];
  referrals: SupportedReferral[];
  properties: SupportedProperty[];
  incidents: SupportedIncident[];
  tasks: SupportedTask[];
  claims: HousingBenefitClaim[];
  compliance: ComplianceItem[];
};

export type SupportedHousingSummary = {
  residents: number;
  occupancyRate: number;
  openIncidents: number;
  highRiskResidents: number;
  arrearsTotal: number;
  weeklyHousingBenefit: number;
  voids: number;
  expiringCompliance: number;
  pendingReferrals: number;
};

const globalStore = globalThis as typeof globalThis & {
  supportedHousingStore?: SupportedHousingState;
};

function cloneState(state: SupportedHousingState): SupportedHousingState {
  return JSON.parse(JSON.stringify(state)) as SupportedHousingState;
}

function state() {
  if (!globalStore.supportedHousingStore) {
    globalStore.supportedHousingStore = cloneState(seedData as SupportedHousingState);
  }

  return globalStore.supportedHousingStore;
}

function idFor(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getSupportedHousingState() {
  const current = state();
  return {
    ...cloneState(current),
    summary: getSupportedHousingSummary(current),
  };
}

export function getSupportedHousingSummary(current = state()): SupportedHousingSummary {
  const units = current.properties.reduce((sum, property) => sum + property.units, 0);
  const occupied = current.properties.reduce((sum, property) => sum + property.occupied, 0);
  const weeklyHousingBenefit = current.claims.reduce((sum, claim) => sum + claim.amount, 0);

  return {
    residents: current.residents.filter((resident) => resident.status !== "Closed").length,
    occupancyRate: units > 0 ? Math.round((occupied / units) * 100) : 0,
    openIncidents: current.incidents.filter((incident) => incident.status !== "Closed").length,
    highRiskResidents: current.residents.filter((resident) => resident.riskLevel === "High").length,
    arrearsTotal: current.residents.reduce((sum, resident) => sum + resident.arrears, 0),
    weeklyHousingBenefit,
    voids: current.properties.reduce((sum, property) => sum + property.voids, 0),
    expiringCompliance: current.compliance.filter((item) => item.status !== "Valid").length,
    pendingReferrals: current.referrals.filter((referral) => !["Accepted", "Declined"].includes(referral.status)).length,
  };
}

export function createSupportedHousingRecord(collection: keyof SupportedHousingState, input: Record<string, unknown>) {
  const current = state();
  const target = current[collection] as Array<Record<string, unknown>>;
  const record = { ...input, id: typeof input.id === "string" ? input.id : idFor(collection.slice(0, 3)) };
  target.unshift(record);
  return record;
}

export function updateSupportedHousingRecord(collection: keyof SupportedHousingState, id: string, input: Record<string, unknown>) {
  const current = state();
  const target = current[collection] as Array<Record<string, unknown>>;
  const index = target.findIndex((item) => item.id === id);

  if (index < 0) {
    return null;
  }

  target[index] = { ...target[index], ...input, id };
  return target[index];
}
