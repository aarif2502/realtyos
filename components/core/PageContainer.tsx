import { cn } from "@/lib/utils";

export function PageContainer({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("page-container min-h-0 flex-1 overflow-y-auto overflow-x-hidden animate-windowReveal pr-1", className)}>
      {children}
    </section>
  );
}
