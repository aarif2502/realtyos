import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return <img src="/RealtyOSLogo.svg" alt="GoldenHub Realty OS" className={cn("object-contain", className)} />;
}
