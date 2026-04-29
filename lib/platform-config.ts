export const appRoutePrefix = (process.env.NEXT_PUBLIC_PLATFORM_APP_PATH || "/realtyos").replace(/\/$/, "") || "";

export const genericPlatformDefaults = {
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || "Supported Housing Platform",
  companyName: process.env.NEXT_PUBLIC_DEFAULT_COMPANY_NAME || "Your Housing Organisation",
  siteTagline: process.env.NEXT_PUBLIC_DEFAULT_SITE_TAGLINE || "Supported accommodation services",
  contactEmail: process.env.NEXT_PUBLIC_DEFAULT_CONTACT_EMAIL || "hello@example.com",
  logoPath: process.env.NEXT_PUBLIC_DEFAULT_LOGO_PATH || "/uksupporthousing_logo.png",
  platformLogoPath: process.env.NEXT_PUBLIC_DEFAULT_PLATFORM_LOGO_PATH || "/uksupporthousing_logo.png",
  primaryColor: process.env.NEXT_PUBLIC_DEFAULT_PRIMARY_COLOR || "#172033",
  secondaryColor: process.env.NEXT_PUBLIC_DEFAULT_SECONDARY_COLOR || "#f4c542",
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
  return process.env.REALTYOS_ADMIN_EMAIL || process.env.NEXT_PUBLIC_DEFAULT_OWNER_EMAIL || "admin@platform.local";
}
