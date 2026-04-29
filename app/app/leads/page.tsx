import Link from "next/link";
import { SectionCard } from "@/components/SectionCard";

export default function LeadsPage() {
  return (
    <SectionCard title="Referrals Replaced Leads" subtitle="The real-estate CRM lead board has been removed from this supported-housing build.">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/app/tenants" className="button-primary">Manage Tenants</Link>
        <Link href="/app/support-notes" className="button-secondary">Support Notes</Link>
      </div>
    </SectionCard>
  );
}
