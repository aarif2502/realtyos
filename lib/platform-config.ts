export const appRoutePrefix = (process.env.NEXT_PUBLIC_PLATFORM_APP_PATH || "/realtyos").replace(/\/$/, "") || "";

export const genericPlatformDefaults = {
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || "Goldenhub RealtyOS",
  companyName: process.env.NEXT_PUBLIC_DEFAULT_COMPANY_NAME || "Goldenhub Investments Ltd",
  siteTagline: process.env.NEXT_PUBLIC_DEFAULT_SITE_TAGLINE || "Supported accommodation services",
  contactEmail: process.env.NEXT_PUBLIC_DEFAULT_CONTACT_EMAIL || "info@goldenhub.co.uk",
  logoPath: process.env.NEXT_PUBLIC_DEFAULT_LOGO_PATH || "/goldenhub-logo.svg",
  platformLogoPath: process.env.NEXT_PUBLIC_DEFAULT_PLATFORM_LOGO_PATH || "/goldenhub-mark.svg",
  primaryColor: process.env.NEXT_PUBLIC_DEFAULT_PRIMARY_COLOR || "#090909",
  secondaryColor: process.env.NEXT_PUBLIC_DEFAULT_SECONDARY_COLOR || "#d4af37",
  accentColor: process.env.NEXT_PUBLIC_DEFAULT_ACCENT_COLOR || "#b99024",
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en-GB",
  timezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Europe/London",
  currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "GBP",
  storageRoot: process.env.DOCUMENT_STORAGE_ROOT || "/mnt/storage",
};

export function appPath(path = "") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${appRoutePrefix}${suffix}` || suffix;
}

export function ownerAdminFallbackEmail() {
  return process.env.REALTYOS_ADMIN_EMAIL || process.env.NEXT_PUBLIC_DEFAULT_OWNER_EMAIL || "admin@goldenhub.co.uk";
}
