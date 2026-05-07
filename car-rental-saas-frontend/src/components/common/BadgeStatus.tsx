import { cn } from "@/lib/utils";
import { formatEnumLabel, getStatusBadgeVariant } from "@/lib/formatters";

const variantClasses: Record<string, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function BadgeStatus({ status }: { status: string }) {
  const variant = getStatusBadgeVariant(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        variantClasses[variant],
      )}
    >
      {formatEnumLabel(status)}
    </span>
  );
}

