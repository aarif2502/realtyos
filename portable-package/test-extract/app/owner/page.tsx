import { PortalUnavailable } from "@/components/PortalUnavailable";

export default function OwnerDashboardPage() {
  return (
    <PortalUnavailable
      portal="Owner"
      description="The owner dashboard is locked until owner portal accounts and property-level permissions are configured."
    />
  );
}
