interface SummaryRowProps {
  label: string;
  value: string;
}

export function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--rm-border)] py-2.5 last:border-b-0">
      <span className="text-sm text-[var(--rm-text-muted)]">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}
