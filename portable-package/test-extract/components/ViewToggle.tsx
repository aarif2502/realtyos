"use client";

import { cn } from "@/lib/utils";

type Mode = "kanban" | "table";

export function ViewToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange("kanban")}
        className={cn("rounded-full px-4 py-2 text-sm", mode === "kanban" ? "bg-ink text-white" : "text-slate-600")}
      >
        Kanban
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn("rounded-full px-4 py-2 text-sm", mode === "table" ? "bg-ink text-white" : "text-slate-600")}
      >
        Table
      </button>
    </div>
  );
}
