"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, ReferenceLine,
} from "recharts";
import { useMemo } from "react";
import { money, num } from "@/lib/format";
import type { Trade } from "@/lib/types";

const AXIS = { stroke: "#8b9199", fontSize: 11 };
const TIP = {
  contentStyle: {
    background: "#141619", border: "1px solid #23262b",
    borderRadius: 8, fontSize: 12,
  },
};

export function EquityCurve({ trades, starting = 0 }: { trades: Trade[]; starting?: number }) {
  const data = useMemo(() => {
    const closed = trades
      .filter((t) => t.status === "closed" && t.exit_at && t.net_pnl != null)
      .sort((a, b) => +new Date(a.exit_at!) - +new Date(b.exit_at!));

    let equity = starting;
    let peak = starting;
    return closed.map((t, i) => {
      equity += Number(t.net_pnl);
      peak = Math.max(peak, equity);
      return {
        i: i + 1,
        date: new Date(t.exit_at!).toLocaleDateString(),
        equity: Math.round(equity * 100) / 100,
        drawdown: Math.round((equity - peak) * 100) / 100,
      };
    });
  }, [trades, starting]);

  if (!data.length) return <Empty label="No closed trades yet" />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0b90b" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f0b90b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#23262b" vertical={false} />
        <XAxis dataKey="date" {...AXIS} tickLine={false} minTickGap={40} />
        <YAxis {...AXIS} tickLine={false} axisLine={false}
          tickFormatter={(v) => `$${v}`} width={70} />
        <Tooltip {...TIP} formatter={(v: number) => money(v)} />
        <ReferenceLine y={starting} stroke="#8b9199" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="equity" stroke="#f0b90b"
          strokeWidth={2} fill="url(#eq)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RDistribution({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    const buckets = [
      { k: "≤-3R", lo: -Infinity, hi: -3 }, { k: "-3..-2", lo: -3, hi: -2 },
      { k: "-2..-1", lo: -2, hi: -1 },      { k: "-1..0", lo: -1, hi: 0 },
      { k: "0..1", lo: 0, hi: 1 },          { k: "1..2", lo: 1, hi: 2 },
      { k: "2..3", lo: 2, hi: 3 },          { k: "≥3R", lo: 3, hi: Infinity },
    ];
    return buckets.map((b) => ({
      bucket: b.k,
      count: trades.filter((t) => {
        const r = t.r_multiple;
        return r != null && r > b.lo && r <= b.hi;
      }).length,
      positive: b.lo >= 0,
    }));
  }, [trades]);

  if (!trades.some((t) => t.r_multiple != null)) {
    return <Empty label="Set stop losses to see R distribution" />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid stroke="#23262b" vertical={false} />
        <XAxis dataKey="bucket" {...AXIS} tickLine={false} />
        <YAxis {...AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
        <Tooltip {...TIP} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.positive ? "#22c55e" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MistakeCost({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { pnl: number; n: number }>();
    trades.filter((t) => t.status === "closed").forEach((t) => {
      t.mistakes?.forEach((m) => {
        const cur = map.get(m) ?? { pnl: 0, n: 0 };
        map.set(m, { pnl: cur.pnl + Number(t.net_pnl ?? 0), n: cur.n + 1 });
      });
    });
    return Array.from(map.entries())
      .map(([mistake, v]) => ({ mistake, pnl: Math.round(v.pnl * 100) / 100, n: v.n }))
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 8);
  }, [trades]);

  if (!data.length) return <Empty label="No tagged mistakes yet" />;

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.mistake} className="flex items-center justify-between text-sm py-2 border-b border-edge/50 last:border-0">
          <div>
            <span>{d.mistake}</span>
            <span className="text-muted text-xs ml-2">×{d.n}</span>
          </div>
          <span className={`font-mono tabular-nums ${d.pnl < 0 ? "text-loss" : "text-win"}`}>
            {money(d.pnl)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BySlice({
  trades, keyFn, title,
}: {
  trades: Trade[];
  keyFn: (t: Trade) => string | null;
  title: string;
}) {
  const rows = useMemo(() => {
    const map = new Map<string, { pnl: number; n: number; wins: number }>();
    trades.filter((t) => t.status === "closed").forEach((t) => {
      const k = keyFn(t);
      if (!k) return;
      const cur = map.get(k) ?? { pnl: 0, n: 0, wins: 0 };
      const p = Number(t.net_pnl ?? 0);
      map.set(k, { pnl: cur.pnl + p, n: cur.n + 1, wins: cur.wins + (p > 0 ? 1 : 0) });
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ k, ...v, wr: (100 * v.wins) / v.n }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 10);
  }, [trades, keyFn]);

  if (!rows.length) return <Empty label="Not enough data" />;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted text-[11px] uppercase tracking-wider border-b border-edge">
          <th className="text-left py-2 font-medium">{title}</th>
          <th className="text-right py-2 font-medium">N</th>
          <th className="text-right py-2 font-medium">Win%</th>
          <th className="text-right py-2 font-medium">P&L</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.k} className="border-b border-edge/40 last:border-0">
            <td className="py-2">{r.k}</td>
            <td className="py-2 text-right font-mono text-muted">{r.n}</td>
            <td className="py-2 text-right font-mono">{num(r.wr, 0)}%</td>
            <td className={`py-2 text-right font-mono ${r.pnl >= 0 ? "text-win" : "text-loss"}`}>
              {money(r.pnl)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-muted text-sm">
      {label}
    </div>
  );
}
