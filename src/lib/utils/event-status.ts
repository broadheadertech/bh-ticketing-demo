import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

interface StatusBadgeConfig {
  variant: BadgeVariant;
  className?: string;
}

export function getStatusBadgeVariant(status: string): StatusBadgeConfig {
  switch (status) {
    case "draft":
      return { variant: "secondary" };
    case "published":
      return { variant: "default" };
    case "on_sale":
      return { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" };
    case "sold_out":
      return { variant: "destructive" };
    case "completed":
      return { variant: "secondary" };
    case "cancelled":
      return { variant: "outline", className: "border-destructive text-destructive" };
    default:
      return { variant: "secondary" };
  }
}
