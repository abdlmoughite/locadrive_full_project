import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div
          className={cn(
            "flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5",
            tone === "success" && "bg-emerald-50",
            tone === "danger" && "bg-red-50",
            tone === "warning" && "bg-amber-50",
          )}
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
          <div className="rounded-2xl bg-slate-950 p-3 text-white">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {subtitle ? <p className="px-6 py-4 text-sm text-slate-500">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}
