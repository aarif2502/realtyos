export type HousingAssociationPaymentStatus = "pending" | "completed" | "missed" | "partial" | "disputed" | "cancelled";

export function calculateHousingAssociationPaymentStatus(input: {
  expectedAmount?: number | string | null;
  amountPaid?: number | string | null;
  dueDate?: string | Date | null;
  manualStatus?: string | null;
}): HousingAssociationPaymentStatus {
  if (input.manualStatus === "disputed" || input.manualStatus === "cancelled") {
    return input.manualStatus;
  }

  const expected = Number(input.expectedAmount || 0);
  const paid = Number(input.amountPaid || 0);
  if (expected > 0 && paid >= expected) return "completed";
  if (paid > 0 && paid < expected) return "partial";

  if (input.dueDate) {
    const due = input.dueDate instanceof Date ? input.dueDate : new Date(input.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(due.getTime()) && due.getTime() < today.getTime()) return "missed";
  }

  return "pending";
}
