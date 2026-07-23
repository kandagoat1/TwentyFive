import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/journal");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-mono text-5xl font-bold tracking-tight">
          Twenty<span className="text-accent">Five</span>
        </h1>
        <p className="mt-4 text-muted">
          An advanced trade journal. Track R-multiples, expectancy, and the
          cost of every mistake you repeat.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/signup" className="btn-primary">Get started</Link>
          <Link href="/login" className="btn-ghost">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
