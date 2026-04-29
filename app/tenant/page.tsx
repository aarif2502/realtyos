import { PortalUnavailable } from "@/components/PortalUnavailable";

export default function TenantHomePage() {
  return (
    <PortalUnavailable
      portal="Tenant"
      description="The tenant self-service overview is locked until tenant accounts and tenant-specific authentication are configured."
    />
  );
}
