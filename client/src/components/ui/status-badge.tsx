import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800",
        acreditada: "bg-[#34c759] text-white",
        regular: "bg-[#ffcc00] text-[#1d1d1f]",
        cursando: "bg-[#0070f3] text-white",
        libre: "bg-[#ff3b30] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  label?: string;
}

export function StatusBadge({
  className,
  variant,
  label,
  ...props
}: StatusBadgeProps) {
  return (
    <div className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {label || variant}
    </div>
  );
}
