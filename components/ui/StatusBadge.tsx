import { cn } from "@/lib/utils";

type Tone = "active" | "pending" | "overdue";

const toneMap: Record<Tone, string> = {
  active: "status-active",
  pending: "status-pending",
  overdue: "status-overdue",
};

function inferTone(label: string): Tone {
  const normalized = label.toLowerCase();
  if (["active", "paid", "won", "completed", "done"].includes(normalized)) {
    return "active";
  }
  if (["pending", "draft", "expiring", "assigned", "contacted", "viewing", "offer", "in progress", "open"].includes(normalized)) {
    return "pending";
  }
  return "overdue";
}

export function StatusBadge({ label, tone }: { label: string; tone?: Tone }) {
  const resolved = tone ?? inferTone(label);
  return <span className={cn("status-badge", toneMap[resolved])}>{label}</span>;
}