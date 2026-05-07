import { Input } from "@/components/ui/input";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (next: { startDate: string; endDate: string }) => void;
}

export function DateRangeFilter({ startDate, endDate, onChange }: DateRangeFilterProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input
        type="date"
        value={startDate}
        onChange={(event) => onChange({ startDate: event.target.value, endDate })}
      />
      <Input
        type="date"
        value={endDate}
        onChange={(event) => onChange({ startDate, endDate: event.target.value })}
      />
    </div>
  );
}
