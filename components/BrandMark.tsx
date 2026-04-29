import { cn } from "@/lib/utils";

import { genericPlatformDefaults } from "@/lib/platform-config";

export function BrandMark({ className, src = genericPlatformDefaults.platformLogoPath, alt = genericPlatformDefaults.productName }: { className?: string; src?: string; alt?: string }) {
  return <img src={src} alt={alt} className={cn("object-contain", className)} />;
}
