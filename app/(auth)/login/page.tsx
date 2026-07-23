"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setBusy(false); return; }
    router.push("/journal"); router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-mono text-2xl font-bold mb-6">
          Twenty<span className="text-accent">Five</span>
        </h1>
        <div className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>
          {err && <p className="text-loss text-sm">{err}</p>}
          <button className="btn-primary w-full" onClick={submit} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-sm text-muted text-center">
            No account? <Link href="/signup" className="text-accent">Sign up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
