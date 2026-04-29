import Link from "next/link";
import { SectionCard } from "@/components/SectionCard";

export default function RenewalsPage() {
  return (
    <SectionCard title="Renewals Replaced By Contract Register" subtitle="Lease-renewal demo queues have been removed. Contract dates now come from PostgreSQL.">
      <Link href="/app/contracts" className="button-primary">Open Contract Register</Link>
    </SectionCard>
  );
}
