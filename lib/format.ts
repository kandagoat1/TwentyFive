export const money = (n: number | null | undefined, c = "USD") =>
  n == null ? "—" :
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: c, maximumFractionDigits: 2,
  }).format(n);

export const num = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : Number(n).toFixed(d);

export const pct = (n: number | null | undefined) =>
  n == null ? "—" : `${Number(n).toFixed(1)}%`;

export const rDisplay = (r: number | null | undefined) =>
  r == null ? "—" : `${r > 0 ? "+" : ""}${Number(r).toFixed(2)}R`;

export const duration = (min: number | null | undefined) => {
  if (min == null) return "—";
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${(min / 60).toFixed(1)}h`;
  return `${(min / 1440).toFixed(1)}d`;
};

export const pnlColor = (n: number | null | undefined) =>
  n == null ? "text-muted" : n > 0 ? "text-win" : n < 0 ? "text-loss" : "text-muted";
