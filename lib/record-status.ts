export type PmsRecordStatus = "active" | "vacant" | "pending" | "ending_soon" | "expired" | "needs_review" | "archived";

export type StatusInput = {
  propertyAddress?: string;
  roomLabel?: string;
  firstName?: string;
  lastName?: string;
  niNumber?: string;
  hbClaimRefNumber?: string;
  gender?: string;
  checkinDate?: string | Date | null;
  checkoutDate?: string | Date | null;
  templateRecordStatus?: string;
  paymentStatus?: string;
};

function asDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasText(value?: string) {
  return Boolean(String(value || "").trim());
}

export function calculateRecordStatus(input: StatusInput, now = new Date()): { status: PmsRecordStatus; reason: string } {
  const templateStatus = String(input.templateRecordStatus || "").toLowerCase();
  if (templateStatus.includes("#ref") || templateStatus.includes("empty")) {
    return { status: "needs_review", reason: `Template status requires review: ${input.templateRecordStatus}` };
  }

  const missing: string[] = [];
  if (!hasText(input.propertyAddress)) missing.push("property address");
  if (!hasText(input.roomLabel)) missing.push("room");
  if (!hasText(input.firstName)) missing.push("first name");
  if (!hasText(input.lastName)) missing.push("last name");
  if (!hasText(input.hbClaimRefNumber)) missing.push("HB claim reference");
  if (!hasText(input.gender)) missing.push("gender");
  if (missing.length) return { status: "needs_review", reason: `Missing ${missing.join(", ")}.` };

  const checkin = asDate(input.checkinDate);
  const checkout = asDate(input.checkoutDate);
  if (!checkin) return { status: "pending", reason: "Check-in date is missing or invalid." };

  const today = new Date(now.toISOString().slice(0, 10));
  if (checkout) {
    const diffDays = Math.ceil((checkout.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) return { status: "expired", reason: "Checkout date is in the past." };
    if (diffDays <= 30) return { status: "ending_soon", reason: "Checkout date is within 30 days." };
  }

  return { status: "active", reason: "Current tenant has required occupancy fields and no past checkout date." };
}

export function roomStatusFromRecordStatus(status: PmsRecordStatus) {
  if (["active", "ending_soon", "needs_review"].includes(status)) return "occupied";
  if (status === "expired" || status === "vacant") return "void";
  return "available";
}
