import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money, pct, num, rDisplay, pnlColor, duration } from "@/lib/format";
import type { Trade, TradeStats } from "@/lib/types";

export const dynamic = "force-dynamic";

function Stat({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="card p-4">
      <div className="label mb-2">{label}</div>
      <div className={`stat-value ${cls}`}>{value}</div>
    </div>
  );
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: { status?: string; symbol?: string };
}) {
  const supabase = createClient();

  let q = supabase.from("trades").select("*").order("entry_at", { ascending: false }).limit(200);
  if (searchParams.status === "open" || searchParams.status === "closed") {
    q = q.eq("status", searchParams.status);
  }
  if (searchParams.symbol) q = q.ilike("symbol", `%${searchParams.symbol}%`);

  const [{ data: trades }, { data: statsRows }] = await Promise.all([
    q,
    supabase.from("trade_stats").select("*").maybeSingle(),
  ]);

  const rows = (trades ?? []) as Trade[];
  const s = (statsRows ?? null) as TradeStats | null;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Trade Journal</h1>
        <Link href="/journal/new" className="btn-primary">Log trade</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Stat label="Net P&L" value={money(s?.net_pnl ?? 0)} cls={pnlColor(s?.net_pnl)} />
        <Stat label="Win rate" value={pct(s?.win_rate)} />
        <Stat label="Avg R" value={rDisplay(s?.avg_r)} cls={pnlColor(s?.avg_r)} />
        <Stat label="Profit factor" value={num(s?.profit_factor)} />
        <Stat label="Trades" value={String(s?.total_trades ?? 0)} />
      </div>

      <form className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="label">Symbol</label>
          <input name="symbol" defaultValue={searchParams.symbol ?? ""}
            placeholder="AAPL" className="input w-32" />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={searchParams.status ?? ""} className="input w-32">
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <button className="btn-ghost">Filter</button>
        {(searchParams.symbol || searchParams.status) && (
          <Link href="/journal" className="text-xs text-muted hover:text-white pb-2.5">Clear</Link>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-edge">
              {["Symbol", "Dir", "Entry", "Exit", "Qty", "R", "Net P&L", "Hold", "Date"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium text-[11px] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-muted">
                No trades yet. <Link href="/journal/new" className="text-accent">Log your first one.</Link>
              </td></tr>
            )}
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-edge/50 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/journal/${t.id}`} className="font-mono font-medium hover:text-accent">
                    {t.symbol}
                  </Link>
                  {t.status === "open" && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent">OPEN</span>
                  )}
                </td>
                <td className={`px-4 py-3 uppercase text-xs ${t.direction === "long" ? "text-win" : "text-loss"}`}>
                  {t.direction}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">{num(t.avg_entry)}</td>
                <td className="px-4 py-3 font-mono tabular-nums">{num(t.avg_exit)}</td>
                <td className="px-4 py-3 font-mono tabular-nums">{num(t.qty, 0)}</td>
                <td className={`px-4 py-3 font-mono tabular-nums ${pnlColor(t.r_multiple)}`}>
                  {rDisplay(t.r_multiple)}
                </td>
                <td className={`px-4 py-3 font-mono tabular-nums font-medium ${pnlColor(t.net_pnl)}`}>
                  {money(t.net_pnl)}
                </td>
                <td className="px-4 py-3 text-muted">{duration(t.hold_minutes)}</td>
                <td className="px-4 py-3 text-muted text-xs">
                  {new Date(t.entry_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
