import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DetailPanelProps {
  title: string;
  description?: string;
  items: Array<{ label: string; value: ReactNode }>;
}

export function DetailPanel({ title, description, items }: DetailPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
            <div className="mt-2 text-sm text-slate-900">{item.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

