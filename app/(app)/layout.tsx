import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const nav = [
    { href: "/journal", label: "Trades" },
    { href: "/journal/analytics", label: "Analytics" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-edge sticky top-0 bg-bg/90 backdrop-blur z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-8">
          <Link href="/journal" className="font-mono font-bold">
            Twenty<span className="text-accent">Five</span>
          </Link>
          <nav className="flex gap-6 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href}
                className="text-muted hover:text-white transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs text-muted hidden sm:block">{user?.email}</span>
            <form action="/auth/signout" method="post">
              <button className="text-xs text-muted hover:text-loss">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
