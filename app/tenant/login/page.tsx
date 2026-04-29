import { PortalUnavailable } from "@/components/PortalUnavailable";

export default function TenantLoginPage() {
  return (
    <PortalUnavailable
      portal="Tenant"
      description="Tenant access will be enabled only after resident portal accounts, secure authentication, and tenant-specific data permissions are configured."
    />
  );
}
