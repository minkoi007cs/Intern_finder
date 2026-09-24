"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { getDemoRecommendation, getPersonalRecommendation } from "@/lib/api";
import { getSupabaseClient } from "@/lib/auth";
import type { Recommendation } from "@/lib/types";

function readableDate(value: string | null): string {
  if (!value) return "Not listed";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [mode, setMode] = useState<"demo" | "personal">("demo");
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setError(false);
    setRecommendation(null);
    async function load() {
      try {
        const token = (await getSupabaseClient()?.auth.getSession())?.data.session?.access_token;
        let item: Recommendation;
        let nextMode: "demo" | "personal" = "demo";
        if (token) {
          try {
            item = await getPersonalRecommendation(id, token);
            nextMode = "personal";
          } catch (reason) {
            if (!(reason instanceof Error) || !reason.message.includes("(404)")) throw reason;
            item = await getDemoRecommendation(id);
          }
        } else {
          item = await getDemoRecommendation(id);
        }
        if (mounted) { setRecommendation(item); setMode(nextMode); }
      } catch {
        if (mounted) setError(true);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [id]);

  const opportunity = recommendation?.opportunity;
  const match = recommendation?.match;
  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-8 md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/opportunities" className="rounded text-sm font-bold text-indigo-700 hover:text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">← Back to opportunities</Link>
        {error ? <div className="mt-8 rounded-3xl bg-white p-8 text-slate-700" role="alert">This demo listing is unavailable. Check that the API is running or return to the feed.</div> : !opportunity || !match ? <div className="mt-8 rounded-3xl bg-white p-8 text-slate-600" role="status">Loading opportunity…</div> :
          <article className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-900">Fictional demo listing</span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">{opportunity.title}</h1>
            <p className="mt-3 text-slate-600">{opportunity.organization} · {opportunity.location ?? "Location not listed"}</p>
            <div className="mt-8 grid gap-4 border-y border-slate-100 py-6 text-sm text-slate-600 sm:grid-cols-3"><div><strong className="block text-slate-900">Type</strong>{opportunity.opportunity_type.toLowerCase()}</div><div><strong className="block text-slate-900">Work style</strong>{opportunity.remote_type.toLowerCase()}</div><div><strong className="block text-slate-900">Deadline</strong>{readableDate(opportunity.deadline)}</div></div>
            <section className="mt-8 rounded-3xl bg-indigo-50 p-6"><p className="text-xs font-bold uppercase tracking-wider text-indigo-800">{mode === "personal" ? "Your profile compatibility" : "Sample profile compatibility"}</p><p className="mt-2 text-4xl font-bold text-indigo-800">{match.overall_score}%</p><p className="mt-2 text-xs text-indigo-800">Compatibility under the current scoring rules; this is not a hiring prediction.</p><ul className="mt-5 space-y-2 text-sm text-slate-700">{match.reasons.map((reason) => <li key={reason}>✓ {reason}</li>)}</ul></section>
            <div className="mt-8 grid gap-5 sm:grid-cols-2"><section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><h2 className="font-bold text-emerald-900">Matching skills</h2><p className="mt-3 text-sm capitalize leading-6 text-emerald-800">{match.matched_skills.join(", ") || "No listed skill matches yet"}</p></section><section className="rounded-2xl border border-amber-100 bg-amber-50 p-5"><h2 className="font-bold text-amber-900">Skills to explore</h2><p className="mt-3 text-sm capitalize leading-6 text-amber-800">{[...match.missing_required_skills, ...match.missing_preferred_skills].join(", ") || "No listed skill gaps"}</p></section></div>
            <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-700"><strong>Suggested next step:</strong> {match.next_action}</p>
            <h2 className="mt-9 text-xl font-bold text-slate-900">About this example</h2><p className="mt-3 leading-8 text-slate-600">{opportunity.description}</p>
            <h2 className="mt-9 text-xl font-bold text-slate-900">Listed skills</h2><div className="mt-4 flex flex-wrap gap-2">{opportunity.skills.map((skill) => <span key={skill.name} className={`rounded-full px-3 py-2 text-xs font-semibold ${skill.required ? "bg-indigo-50 text-indigo-800" : "bg-slate-100 text-slate-700"}`}>{skill.name} · {skill.required ? "Required" : "Preferred"}</span>)}</div>
            <p className="mt-9 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">Source: {opportunity.source_name}. This is not a real opening and has no application link.</p>
          </article>}
      </div>
    </main>
  );
}
