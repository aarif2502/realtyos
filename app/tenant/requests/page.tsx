import { PortalUnavailable } from "@/components/PortalUnavailable";

export default function TenantRequestsPage() {
  return <PortalUnavailable portal="Tenant" description="Tenant request access is locked until tenant portal accounts are configured." />;
}
