import Link from "next/link";
import { SectionCard } from "@/components/SectionCard";

export default function ListingsPage() {
  return (
    <SectionCard title="Listings Replaced By Properties" subtitle="Marketing listings have been removed. Manage supported-housing properties, rooms, landlords, and documents from the live ERP modules.">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/app/properties" className="button-primary">Open Properties</Link>
        <Link href="/app/owners" className="button-secondary">Open Landlords</Link>
      </div>
    </SectionCard>
  );
}
