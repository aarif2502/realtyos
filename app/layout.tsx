import type { Metadata } from "next";
import "@/app/globals.css";
import "@/app/goldenhub-theme.css";
import { ThemeProvider } from "@/hooks/useTheme";
import { RoleProvider } from "@/hooks/useRole";
import { genericPlatformDefaults } from "@/lib/platform-config";

const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SEO_TITLE || `${genericPlatformDefaults.companyName} | ${genericPlatformDefaults.productName}`,
  description: "Goldenhub RealtyOS is a secure supported accommodation ERP for properties, residents, support evidence, rent ledgers, documents, and management reporting.",
  metadataBase: new URL(appBaseUrl),
  icons: {
    icon: "/goldenhub-mark.svg",
    shortcut: "/goldenhub-mark.svg",
    apple: "/goldenhub-mark.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased goldenhub-app" suppressHydrationWarning>
        <ThemeProvider>
          <RoleProvider>
            {children}
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
