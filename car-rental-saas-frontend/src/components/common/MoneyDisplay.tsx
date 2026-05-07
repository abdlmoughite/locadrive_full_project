import { formatMoney } from "@/lib/formatters";

export function MoneyDisplay({ amount, className }: { amount: string | number | null | undefined; className?: string }) {
  return <span className={className}>{formatMoney(amount)}</span>;
}

