import Link from "next/link";

const features = [
  { href: "/journal", title: "Trade Journal", desc: "Log trades, track R-multiples, review mistakes.", ready: true },
  { href: "#", title: "Watchlist", desc: "Coming soon.", ready: false },
  { href: "#", title: "Backtester", desc: "Coming soon.", ready: false },
];

export default function Dashboard() {
  return (
    <>
      <h1 className="text-xl font-semibold mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <Link key={f.title} href={f.href}
            className={`card p-5 transition-colors ${f.ready ? "hover:border-accent/50" : "opacity-40 pointer-events-none"}`}>
            <h2 className="font-medium">{f.title}</h2>
            <p className="text-sm text-muted mt-1">{f.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
