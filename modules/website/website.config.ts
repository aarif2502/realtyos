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
  "Supported accommodation operations",
  "Council-ready evidence records",
  "Secure Goldenhub staff workspace",
  "Portfolio and document control",
];

export const websiteServices = [
  { title: "Accommodation management", text: "Properties, rooms, residents, repairs and documents structured around supported-accommodation delivery.", icon: Home },
  { title: "Support evidence", text: "Weekly notes, support plans, safeguarding actions and outcome records in one auditable Goldenhub workflow.", icon: HeartHandshake },
  { title: "Rent visibility", text: "Rent ledger, HB/UC tracking, arrears signals, contracts and landlord payment information presented for early action.", icon: Banknote },
  { title: "Referral CRM", text: "Referral sources, councils, charities, communication logs and follow-ups managed in a focused pipeline.", icon: MessageSquareText },
  { title: "Compliance rhythm", text: "Risk reviews, incidents, document checks and operational reminders made visible for staff and managers.", icon: ShieldCheck },
  { title: "Executive reporting", text: "Storyboards, BI reports and practical management views for operators, councils and stakeholders.", icon: Layers3 },
];

export const websiteHeroProofCards = [
  { title: "Portfolio-ready", text: "Designed to scale across Goldenhub supported accommodation services.", icon: Building2 },
  { title: "Weekly evidence", text: "Support notes, plans, safeguarding and outcomes connected to each resident.", icon: HeartHandshake },
  { title: "Rent clarity", text: "HB/UC, arrears and landlord payment visibility built into daily operations.", icon: FileText },
  { title: "Council-ready reports", text: "Clear records for reviews, audits, commissioners and partners.", icon: ShieldCheck },
];

export const websiteOperatingMetrics = [
  { value: "Live", label: "Portfolio" },
  { value: "Weekly", label: "Support" },
  { value: "HB/UC", label: "Rent" },
  { value: "Audit", label: "Risk" },
];

export const websiteOperatingSteps = [
  { step: "01", title: "Referral", text: "Capture source, support needs, eligibility and next actions.", icon: UserRoundCheck },
  { step: "02", title: "Placement", text: "Assign the room, tenancy, rent profile and landlord relationship.", icon: MapPinned },
  { step: "03", title: "Support", text: "Log visits, safeguarding, risks, outcomes and evidence.", icon: HeartHandshake },
  { step: "04", title: "Reporting", text: "Give managers, councils and partners the facts they need.", icon: BadgeCheck },
];

export const websiteIcons = {
  CalendarCheck,
  LockKeyhole,
  Sparkles,
  Wrench,
};
