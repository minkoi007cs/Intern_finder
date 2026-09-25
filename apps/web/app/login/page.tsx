"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signInUrl } from "@/lib/auth";

const ERRORS: Record<string, string> = {
  denied: "Sign-in was cancelled.",
  expired: "The sign-in took too long. Please try again.",
  state: "That sign-in link was not started in this browser. Please try again.",
  exchange: "The sign-in could not be completed. Please try again.",
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) setError(ERRORS[code] ?? "Sign-in failed. Please try again.");
    void getSession().then(({ signedIn }) => {
      if (mounted && signedIn) router.replace("/profile");
    });
    return () => { mounted = false; };
  }, [router]);

  const button = "block w-full rounded-xl px-5 py-3 text-center font-bold";
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8fafc] px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100">
        <Link href="/" className="text-sm font-bold text-indigo-700">← OpportunityOS</Link>
        <h1 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">One account for all your apps. Build a profile to see how opportunities align with your goals.</p>
        {error && <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900" role="alert">{error}</p>}
        <div className="mt-7 space-y-3">
          <a href={signInUrl()} className={`${button} bg-indigo-600 text-white hover:bg-indigo-700`}>Continue with email</a>
          <a href={signInUrl("google")} className={`${button} border border-slate-200 bg-white text-slate-700 hover:border-indigo-300`}>Continue with Google</a>
          <a href={signInUrl("github")} className={`${button} border border-slate-200 bg-white text-slate-700 hover:border-indigo-300`}>Continue with GitHub</a>
          <a href={signInUrl("microsoft")} className={`${button} border border-slate-200 bg-white text-slate-700 hover:border-indigo-300`}>Continue with Microsoft</a>
        </div>
        <p className="mt-6 text-xs leading-5 text-slate-500">New here? The same buttons create your account.</p>
      </div>
    </main>
  );
}
