import type { Metadata } from "next";
import "@/app/globals.css";
import { ThemeProvider } from "@/hooks/useTheme";
import { RoleProvider } from "@/hooks/useRole";
import { genericPlatformDefaults } from "@/lib/platform-config";

const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SEO_TITLE || `${genericPlatformDefaults.companyName} | ${genericPlatformDefaults.productName}`,
  description: "Supported housing management ERP with PostgreSQL-backed properties, tenants, contracts, rent ledger, documents, and reporting.",
  metadataBase: new URL(appBaseUrl),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <RoleProvider>
            {children}
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
