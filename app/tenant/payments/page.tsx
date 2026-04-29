import { PortalUnavailable } from "@/components/PortalUnavailable";

export default function TenantPaymentsPage() {
  return <PortalUnavailable portal="Tenant" description="Tenant payment access is locked until tenant portal accounts are configured." />;
}
