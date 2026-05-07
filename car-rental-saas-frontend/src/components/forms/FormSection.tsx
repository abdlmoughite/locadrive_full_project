import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormSectionProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ className, title, description, children, ...props }: FormSectionProps) {
  return (
    <section className={cn("rounded-3xl border border-slate-200 bg-white p-6 shadow-sm", className)} {...props}>
      {title || description ? (
        <div className="mb-6 space-y-2">
          {title ? <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2> : null}
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
