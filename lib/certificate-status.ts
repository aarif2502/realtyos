export type CertificateStatus = "valid" | "expiring_soon" | "expired" | "missing_info";

export const defaultCertificateWarningDays = Number(process.env.CERTIFICATE_EXPIRY_WARNING_DAYS || 60);

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function calculateCertificateStatus(input: {
  expiryDate?: string | Date | null;
  certificateName?: string | null;
  filePath?: string | null;
}, warningDays = defaultCertificateWarningDays): CertificateStatus {
  if (!input.certificateName?.trim() || !input.expiryDate || !input.filePath?.trim()) {
    return "missing_info";
  }

  const expiry = input.expiryDate instanceof Date ? input.expiryDate : new Date(input.expiryDate);
  if (Number.isNaN(expiry.getTime())) return "missing_info";

  const today = startOfToday();
  if (expiry.getTime() < today.getTime()) return "expired";

  const warningLimit = new Date(today);
  warningLimit.setDate(warningLimit.getDate() + warningDays);

  return expiry.getTime() <= warningLimit.getTime() ? "expiring_soon" : "valid";
}

export function certificateStatusLabel(status: CertificateStatus) {
  return status.replace(/_/g, " ");
}
