import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "accent";
};

export function StatCard({ label, value, helper, tone = "default" }: StatCardProps) {
  return (
    <article
      className={cn(
        "glass-panel rounded-3xl p-5",
        tone === "accent" && "border-accent/30 bg-gradient-to-br from-white to-accentSoft/50",
      )}
    >
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </article>
  );
}
