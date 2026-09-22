"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseClient } from "@/lib/auth";
import { getProfile, putProfile, type ProfilePayload } from "@/lib/profile";

const emptyProfile: ProfilePayload = {
  full_name: "", university: "", major: "", minor: null, graduation_year: null,
  academic_year: 2, location: null, latitude: null, longitude: null,
  search_radius_miles: 50, preferred_remote: true, preferred_types: ["INTERNSHIP", "RESEARCH"],
  interests: [], career_goals: null, research_interests: [], skills: [],
};

const types = ["INTERNSHIP", "RESEARCH", "SCHOLARSHIP", "HACKATHON", "JOB", "PART_TIME"];
const listFromText = (text: string) => text.split(",").map((value) => value.trim()).filter(Boolean);

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfilePayload>(emptyProfile);
  const [skillsText, setSkillsText] = useState("");
  const [interestsText, setInterestsText] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token;
      if (!accessToken) { setLoading(false); return; }
      setToken(accessToken);
      try {
        const saved = await getProfile(accessToken);
        if (saved) {
          setProfile(saved);
          setSkillsText(saved.skills.join(", "));
          setInterestsText(saved.interests.join(", "));
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    }).catch(() => { setMessage("Could not load your session."); setLoading(false); });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage("");
    try {
      const saved = await putProfile(token, { ...profile, skills: listFromText(skillsText), interests: listFromText(interestsText) });
      setProfile(saved);
      setSkillsText(saved.skills.join(", "));
      setInterestsText(saved.interests.join(", "));
      setMessage("Profile saved. Your feed can now use these details.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof ProfilePayload>(key: K, value: ProfilePayload[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  if (loading) return <main className="p-10 text-slate-600" role="status">Loading profile…</main>;
  if (!token) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold">Sign in to build your profile</h1><p className="mt-3 text-sm text-slate-600">Your profile is private and tied to your account.</p><Link href="/login" className="mt-6 inline-block rounded-full bg-indigo-600 px-6 py-3 font-bold text-white">Go to sign in</Link></div></main>;

  return <main className="min-h-screen bg-[#f8fafc] px-6 py-10 md:px-10"><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between gap-4"><Link href="/opportunities" className="text-sm font-bold text-indigo-700">← Opportunity feed</Link><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Private profile</span></div><h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-950">Your student profile</h1><p className="mt-3 text-sm leading-6 text-slate-600">Tell us what you have learned and what you want to explore. You can edit this anytime. Only confirmed fields are saved.</p><form onSubmit={submit} className="mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-9"><section className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Full name<input required maxLength={160} value={profile.full_name} onChange={(event) => update("full_name", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label><label className="text-sm font-semibold text-slate-700">University<input required maxLength={200} value={profile.university} onChange={(event) => update("university", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label><label className="text-sm font-semibold text-slate-700">Major<input required maxLength={160} value={profile.major} onChange={(event) => update("major", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label><label className="text-sm font-semibold text-slate-700">Academic year<select value={profile.academic_year} onChange={(event) => update("academic_year", Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"><option value={1}>First year</option><option value={2}>Second year</option><option value={3}>Third year</option><option value={4}>Fourth year</option><option value={5}>Fifth year or beyond</option></select></label></section><section className="space-y-5 border-t border-slate-100 pt-7"><h2 className="text-lg font-bold text-slate-950">Skills and interests</h2><label className="block text-sm font-semibold text-slate-700">Skills <span className="font-normal text-slate-400">(separate with commas)</span><textarea rows={2} value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="Python, React, SQL" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label><label className="block text-sm font-semibold text-slate-700">Interests <span className="font-normal text-slate-400">(separate with commas)</span><textarea rows={2} value={interestsText} onChange={(event) => setInterestsText(event.target.value)} placeholder="Machine Learning, Research" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label></section><section className="space-y-5 border-t border-slate-100 pt-7"><h2 className="text-lg font-bold text-slate-950">What you are looking for</h2><div className="flex flex-wrap gap-3">{types.map((type) => <label key={type} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={profile.preferred_types.includes(type)} onChange={(event) => update("preferred_types", event.target.checked ? [...profile.preferred_types, type] : profile.preferred_types.filter((item) => item !== type))} />{type.replaceAll("_", " ")}</label>)}</div><label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={profile.preferred_remote} onChange={(event) => update("preferred_remote", event.target.checked)} />Show remote opportunities</label><label className="block text-sm font-semibold text-slate-700">Location<input value={profile.location ?? ""} onChange={(event) => update("location", event.target.value || null)} placeholder="New York, NY" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label><p className="text-xs leading-5 text-slate-500">Location text is saved for your profile. Distance scoring becomes available after you add coordinates in a later release.</p></section><div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-7"><button disabled={saving} className="rounded-full bg-indigo-600 px-7 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button>{message && <p className="text-sm text-slate-600" role="status">{message}</p>}</div></form></div></main>;
}
