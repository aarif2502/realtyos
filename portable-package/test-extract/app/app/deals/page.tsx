import Link from "next/link";
import { SectionCard } from "@/components/SectionCard";

export default function DealsPage() {
  return (
    <SectionCard title="Deals Replaced By Contracts" subtitle="Property sales deal tracking has been removed. Use supported-housing contracts and payments instead.">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/app/contracts" className="button-primary">Open Contracts</Link>
        <Link href="/app/payments" className="button-secondary">Open Payments</Link>
      </div>
    </SectionCard>
  );
}
