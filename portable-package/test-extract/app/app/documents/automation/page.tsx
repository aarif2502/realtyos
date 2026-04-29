import Link from "next/link";
import { RoleGate } from "@/components/RoleGate";
import { SectionCard } from "@/components/SectionCard";

export default function DocumentAutomationPage() {
  return (
    <RoleGate allow={["admin", "agent"]}>
      <SectionCard title="Document Automation" subtitle="Demo real-estate templates have been removed. Upload signed tenancy, housing benefit, landlord, and property documents into the live document store.">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/app/documents" className="button-primary">Upload Documents</Link>
          <Link href="/app/contracts" className="button-secondary">Open Contracts</Link>
        </div>
      </SectionCard>
    </RoleGate>
  );
}
