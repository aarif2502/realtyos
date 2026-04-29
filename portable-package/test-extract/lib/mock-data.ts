import agentPerformanceJson from "@/data/agent-performance.json";
import contractsJson from "@/data/contracts.json";
import contractTemplatesJson from "@/data/contract-templates.json";
import dashboardKpisJson from "@/data/dashboard-kpis.json";
import dealsJson from "@/data/deals.json";
import documentsJson from "@/data/documents.json";
import leadStagesJson from "@/data/lead-stages.json";
import leadsJson from "@/data/leads.json";
import maintenanceBoardJson from "@/data/maintenance-board.json";
import maintenanceStagesJson from "@/data/maintenance-stages.json";
import maintenanceTicketsJson from "@/data/maintenance-tickets.json";
import monthlyIncomeJson from "@/data/monthly-income.json";
import notificationTemplatesJson from "@/data/notification-templates.json";
import notificationsJson from "@/data/notifications.json";
import ownerPortfolioJson from "@/data/owner-portfolio.json";
import ownerReportsJson from "@/data/owner-reports.json";
import ownersJson from "@/data/owners.json";
import paymentScheduleJson from "@/data/payment-schedule.json";
import portfolioGroupsJson from "@/data/portfolio-groups.json";
import propertiesJson from "@/data/properties.json";
import propertyDetailTabsJson from "@/data/property-detail-tabs.json";
import propertyRowsJson from "@/data/property-rows.json";
import recentActivityJson from "@/data/recent-activity.json";
import renewalQueueJson from "@/data/renewal-queue.json";
import revenueTrendJson from "@/data/revenue-trend.json";
import rolePermissionsJson from "@/data/role-permissions.json";
import tenantContractJson from "@/data/tenant-contract.json";
import tenantRequestsJson from "@/data/tenant-requests.json";
import tenantsJson from "@/data/tenants.json";
import vacancyDataJson from "@/data/vacancy-data.json";
import vacancyIntelligenceJson from "@/data/vacancy-intelligence.json";

export type LeadStage = "New" | "Contacted" | "Viewing" | "Offer" | "Won";
export type MaintenanceStage = "Open" | "Assigned" | "Done";

export type Lead = {
  id: string;
  name: string;
  property: string;
  budget: string;
  stage: LeadStage;
  timeline: string[];
  notes: string;
  whatsapp: string;
};

export type MaintenanceTicketBoard = {
  id: string;
  title: string;
  tenant: string;
  property: string;
  vendor: string;
  sla: string;
  stage: MaintenanceStage;
  photos: string[];
};

export type Tenant = {
  id: string;
  name: string;
  propertyId: string;
  unit: string;
  leaseEnd: string;
  balance: number;
  status: "Current" | "Delinquent" | "Notice";
};

export type LegacyMaintenanceTicket = {
  id: string;
  propertyId: string;
  unit: string;
  issue: string;
  priority: "Low" | "Medium" | "High";
  assignee: string;
  status: "Open" | "In Progress" | "Awaiting Parts" | "Completed";
};

export type NotificationItem = {
  id: string;
  title: string;
  time: string;
  tone: "active" | "pending" | "overdue";
  channel: "WhatsApp" | "Email" | "SMS";
};

export type TenantRequest = {
  id: string;
  title: string;
  status: "Open" | "Assigned" | "Done";
  priority: "Low" | "Medium" | "High";
  sla: string;
  photoCount: number;
  updated: string;
};

export const dashboardKpis = dashboardKpisJson as Array<{ label: string; value: string; tone: "active" | "pending" | "overdue"; helper: string }>;
export const monthlyIncomeData = monthlyIncomeJson as Array<{ month: string; income: number }>;
export const vacancyData = vacancyDataJson as Array<{ month: string; loss: number }>;
export const recentActivityFeed = recentActivityJson as string[];
export const propertyRows = propertyRowsJson as Array<{ id: string; name: string; owner: string; status: string; occupancy: string }>;
export const propertyDetailTabs = propertyDetailTabsJson as string[];
export const leadStages = leadStagesJson as LeadStage[];
export const leads = leadsJson as Lead[];
export const deals = dealsJson as Array<{ id: string; lead: string; property: string; offer: string; status: string; conversion: string }>;
export const contracts = contractsJson as Array<{ id: string; tenant: string; property: string; plan: string; expiry: string; status: string }>;
export const paymentSchedule = paymentScheduleJson as Array<{ id: string; tenant: string; property: string; dueDate: string; amount: number; status: string }>;
export const maintenanceStages = maintenanceStagesJson as MaintenanceStage[];
export const maintenanceBoard = maintenanceBoardJson as MaintenanceTicketBoard[];
export const tenants = tenantsJson as Tenant[];
export const maintenanceTickets = maintenanceTicketsJson as LegacyMaintenanceTicket[];
export const owners = ownersJson as Array<{ id: string; name: string; properties: number; roi: string }>;
export const documents = documentsJson as Array<{ id: string; name: string; property: string; tenant: string; type: string }>;
export const properties = propertiesJson as Array<{ id: string; name: string; city: string }>;
export const revenueTrend = revenueTrendJson as Array<{ month: string; amount: number }>;
export const notifications = notificationsJson as NotificationItem[];

export const notificationTemplates = notificationTemplatesJson as Array<{
  id: string;
  event: string;
  channel: string;
  audience: string;
  template: string;
  status: "Live" | "Draft";
}>;

export const contractTemplates = contractTemplatesJson as Array<{
  id: string;
  name: string;
  fields: string[];
  lastUpdated: string;
}>;

export const portfolioGroups = portfolioGroupsJson as Array<{
  id: string;
  name: string;
  properties: number;
  monthlyIncome: number;
  occupancy: string;
  roi: string;
}>;

export const renewalQueue = renewalQueueJson as Array<{
  id: string;
  contract: string;
  tenant: string;
  property: string;
  currentRent: number;
  suggestedRent: number;
  expiry: string;
  status: "Alert" | "Ready" | "In Review";
}>;

export const vacancyIntelligence = vacancyIntelligenceJson as Array<{
  id: string;
  property: string;
  unit: string;
  daysVacant: number;
  lostRevenue: number;
  suggestion: string;
}>;

export const agentPerformance = agentPerformanceJson as Array<{
  id: string;
  name: string;
  dealsClosed: number;
  conversion: number;
  revenue: number;
}>;

export const ownerPortfolio = ownerPortfolioJson as Array<{
  id: string;
  name: string;
  units: number;
  occupied: number;
  monthlyIncome: number;
  roi: string;
  city: string;
}>;

export const ownerReports = ownerReportsJson as Array<{
  id: string;
  name: string;
  period: string;
  type: string;
  format: string;
}>;

export const tenantRequests = tenantRequestsJson as TenantRequest[];

export const tenantContract = tenantContractJson as {
  id: string;
  property: string;
  unit: string;
  tenant: string;
  start: string;
  end: string;
  rent: string;
  deposit: string;
  status: string;
};

export const rolePermissions = rolePermissionsJson as Array<{ role: string; canAccess: string }>;

export function propertyName(propertyId: string) {
  return properties.find((property) => property.id === propertyId)?.name ?? "Unknown property";
}

