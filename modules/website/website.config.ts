import {
  BadgeCheck,
  Banknote,
  Building2,
  CalendarCheck,
  FileText,
  HeartHandshake,
  Home,
  Layers3,
  LockKeyhole,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Wrench,
} from "lucide-react";

export const websiteSignInHref = "/realtyos/admin/login";

export const websiteTrustSignals = [
  "Supported housing operations",
  "Council-ready records",
  "Secure staff workspace",
  "Shared document storage",
];

export const websiteServices = [
  { title: "Accommodation management", text: "Properties, rooms, tenants, repairs and documents structured around supported-housing work.", icon: Home },
  { title: "Support evidence", text: "Weekly notes, support plans, safeguarding actions and outcome records in one auditable flow.", icon: HeartHandshake },
  { title: "Rent visibility", text: "Rent ledger, HB/UC tracking, arrears signals, contracts and landlord payment information.", icon: Banknote },
  { title: "Partner CRM", text: "Referral sources, councils, charities, communication logs and follow-ups managed in a modern pipeline.", icon: MessageSquareText },
  { title: "Compliance rhythm", text: "Risk reviews, incidents, document checks and operational reminders made visible for staff.", icon: ShieldCheck },
  { title: "Management reporting", text: "Storyboards, BI reports and practical operational views for managers and stakeholders.", icon: Layers3 },
];

export const websiteHeroProofCards = [
  { title: "Designed for growing portfolios", text: "Built to scale across supported accommodation services.", icon: Building2 },
  { title: "Weekly evidence", text: "Support notes, plans, safeguarding and outcomes.", icon: HeartHandshake },
  { title: "Rent clarity", text: "HB/UC, arrears and landlord payment visibility.", icon: FileText },
  { title: "Council-ready reports", text: "Clear records for reviews, audits and partners.", icon: ShieldCheck },
];

export const websiteOperatingMetrics = [
  { value: "Scalable", label: "Portfolio" },
  { value: "Weekly", label: "Support" },
  { value: "HB/UC", label: "Rent" },
  { value: "Audit", label: "Risk" },
];

export const websiteOperatingSteps = [
  { step: "01", title: "Referral", text: "Capture source, needs, eligibility and the next action.", icon: UserRoundCheck },
  { step: "02", title: "Placement", text: "Assign the room, tenancy, rent and landlord relationship.", icon: MapPinned },
  { step: "03", title: "Support", text: "Log visits, safeguarding, risks, outcomes and evidence.", icon: HeartHandshake },
  { step: "04", title: "Reporting", text: "Give managers, councils and partners the facts they need.", icon: BadgeCheck },
];

export const websiteIcons = {
  CalendarCheck,
  LockKeyhole,
  Sparkles,
  Wrench,
};
