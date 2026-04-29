import Link from "next/link";
import { SectionCard } from "@/components/SectionCard";

export default function NotificationsPage() {
  return (
    <SectionCard title="Operational Alerts" subtitle="The demo notification engine has been removed. Live alerts are now based on open incidents and operational records.">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/app/maintenance" className="button-primary">Open Maintenance</Link>
        <Link href="/app/analytics" className="button-secondary">Open Analytics</Link>
      </div>
    </SectionCard>
  );
}
