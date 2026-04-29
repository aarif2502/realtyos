import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type KanbanColumn<T> = {
  id: string;
  title: string;
  items: T[];
};

type KanbanBoardProps<T> = {
  columns: KanbanColumn<T>[];
  renderItem: (item: T) => ReactNode;
  className?: string;
};

export function KanbanBoard<T>({ columns, renderItem, className }: KanbanBoardProps<T>) {
  return (
    <div className={cn("grid gap-4 xl:grid-cols-4", className)}>
      {columns.map((column) => (
        <section key={column.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{column.title}</p>
            <span className="text-xs text-slate-500">{column.items.length}</span>
          </div>
          <div className="mt-3 space-y-2">{column.items.map((item, index) => <div key={`${column.id}-${index}`}>{renderItem(item)}</div>)}</div>
        </section>
      ))}
    </div>
  );
}
