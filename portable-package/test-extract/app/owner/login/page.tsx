import { PortalUnavailable } from "@/components/PortalUnavailable";

export default function OwnerLoginPage() {
  return (
    <PortalUnavailable
      portal="Owner"
      description="Owner access will be enabled only after the admin creates landlord accounts, assigns properties, and activates a real owner login workflow."
    />
  );
}
