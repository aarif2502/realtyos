import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TableShell({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("overflow-x-auto", className)}>{children}</div>;
}

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return <table className={cn("w-full min-w-[760px] text-left text-sm", className)}>{children}</table>;
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}
