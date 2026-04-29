import Link from "next/link";
import { SectionCard } from "@/components/SectionCard";

export default function AgentPerformancePage() {
  return (
    <SectionCard title="Staff Performance" subtitle="Real-estate agent metrics have been removed. Staff reporting will be driven by support notes, incidents, and completed operational tasks.">
      <Link href="/app/analytics" className="button-primary">Open Reports & Analytics</Link>
    </SectionCard>
  );
}
