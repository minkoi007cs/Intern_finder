import "server-only";
import { createHash } from "node:crypto";
import type { Opportunity } from "./types";

export type LiveRecord = {
  opportunity: Opportunity;
  features: { tags: string[]; majors: string[]; minimumYear: number | null; latitude: null; longitude: null };
  last_verified_at: string;
  source_id: string;
};

const boards = {
  "greenhouse:cloudflare": { vendor: "greenhouse", slug: "cloudflare", name: "Cloudflare" },
  "greenhouse:datadog": { vendor: "greenhouse", slug: "datadog", name: "Datadog" },
  "greenhouse:stripe": { vendor: "greenhouse", slug: "stripe", name: "Stripe" },
  "greenhouse:airbnb": { vendor: "greenhouse", slug: "airbnb", name: "Airbnb" },
  "lever:field-ai": { vendor: "lever", slug: "field-ai", name: "Field AI" },
  "lever:immuta": { vendor: "lever", slug: "immuta", name: "Immuta" },
  "lever:crestoperations": { vendor: "lever", slug: "crestoperations", name: "Crest Industries" },
  "greenhouse:schonfeld": { vendor: "greenhouse", slug: "schonfeld", name: "Schonfeld" },
  "greenhouse:kodiaksolutions": { vendor: "greenhouse", slug: "kodiaksolutions", name: "Kodiak Solutions" },
  "greenhouse:precisionaq": { vendor: "greenhouse", slug: "precisionaq", name: "Precision AQ" },
  "greenhouse:oklo": { vendor: "greenhouse", slug: "oklo", name: "Oklo" },
  "greenhouse:kyowakirinusa90": { vendor: "greenhouse", slug: "kyowakirinusa90", name: "Kyowa Kirin" },
  "greenhouse:farmersmutualhailinsurancecompany": { vendor: "greenhouse", slug: "farmersmutualhailinsurancecompany", name: "Farmers Mutual Hail" },
  "greenhouse:acluinternships": { vendor: "greenhouse", slug: "acluinternships", name: "ACLU" },
  "greenhouse:nationallifeinsurancecompany": { vendor: "greenhouse", slug: "nationallifeinsurancecompany", name: "National Life" },
} as const;

export type BoardId = keyof typeof boards;
export const boardIds = Object.keys(boards) as BoardId[];
export function isBoardId(value: string): value is BoardId { return Object.prototype.hasOwnProperty.call(boards, value); }

type GreenhouseJob = { id?: number; title?: string; absolute_url?: string; content?: string; location?: { name?: string } };
type LeverJob = { id?: string; text?: string; descriptionPlain?: string; hostedUrl?: string; applyUrl?: string; createdAt?: number; workplaceType?: string; country?: string; categories?: { location?: string; commitment?: string; team?: string } };

const studentRole = /\b(intern(?:ship)?|co[ -]?op|new grad(?:uate)?|university grad(?:uate)?|early career)\b/i;
const advancedOnly = /\b(?:PhD|doctoral|postdoc|MBA)\b/i;
const usState = /,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/i;
const usCity = /\b(?:Austin|New York|Seattle|San Francisco|Boston|Chicago|Los Angeles|Pittsburgh|Philadelphia|Washington|Atlanta|Denver|Portland|Irvine|Columbus|College Park|Raleigh|San Jose|San Diego|Palo Alto|Menlo Park|Sunnyvale|Mountain View|Cambridge|Pineville|West Des Moines|Santa Clara|Princeton|Miami)\b/i;
const usStateName = /\b(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i;
function isUsLocation(location: string, title: string): boolean {
  const combined = `${location} ${title}`;
  return /\b(?:USA|United States|US-only|US remote|Remote - US)\b/i.test(combined) || usState.test(combined) || usStateName.test(combined) || usCity.test(combined);
}
const skillNames = ["Python", "JavaScript", "TypeScript", "React", "SQL", "Go", "Rust", "Java", "C++", "AWS", "Kubernetes", "Docker", "Machine Learning"];

function cleanText(value: string): string {
  // Some boards HTML-encode an entire markup fragment, occasionally twice.
  let decoded = value;
  for (let pass = 0; pass < 2; pass++) {
    decoded = decoded.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/&#60;/g, "<").replace(/&#62;/g, ">").replace(/&amp;/gi, "&");
  }
  return decoded.replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ").trim().slice(0, 2400);
}

function safeJobUrl(value: string | undefined, vendor: "greenhouse" | "lever"): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const allowed = vendor === "greenhouse"
      ? ["job-boards.greenhouse.io", "boards.greenhouse.io"]
      : ["jobs.lever.co"];
    return allowed.includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
}

function stableId(value: string): string {
  const bytes = createHash("sha256").update(`intern-finder:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isoDate(value: string | number | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

function makeRecord(input: {
  sourceId: string; title: string; organization: string; description: string; location: string | null;
  remoteType: string; postedDate: string | null; sourceUrl: string; applicationUrl: string; verifiedAt: string;
}): LiveRecord {
  const opportunityType = /\bco[ -]?op\b/i.test(input.title) ? "COOP" : /\b(intern|internship)\b/i.test(input.title) ? "INTERNSHIP" : "JOB";
  const haystack = `${input.title} ${input.description}`;
  const skills = skillNames.filter((name) => new RegExp(`(^|[^a-z0-9+#])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+#]|$)`, "i").test(haystack));
  return {
    source_id: input.sourceId,
    last_verified_at: input.verifiedAt,
    opportunity: {
      id: stableId(input.sourceId), title: input.title.slice(0, 240), organization: input.organization,
      description: input.description, opportunity_type: opportunityType, location: input.location,
      remote_type: input.remoteType, posted_date: input.postedDate, deadline: null,
      application_url: input.applicationUrl, source_name: input.organization,
      source_url: input.sourceUrl, is_demo: false,
      skills: skills.map((name) => ({ name, required: false })),
      last_verified_at: input.verifiedAt,
    },
    features: { tags: skills, majors: [], minimumYear: null, latitude: null, longitude: null },
  };
}

export async function fetchBoard(boardId: BoardId): Promise<LiveRecord[]> {
  const board = boards[boardId];
  const verifiedAt = new Date().toISOString();
  const url = board.vendor === "greenhouse"
    ? `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`
    : `https://api.lever.co/v0/postings/${board.slug}?mode=json`;
  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${boardId} returned HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (board.vendor === "greenhouse") {
    const jobs = (data as { jobs?: unknown }).jobs;
    if (!Array.isArray(jobs)) throw new Error(`${boardId} returned an invalid job list`);
    return jobs.flatMap((raw) => {
      const job = raw as GreenhouseJob;
      if (!job.id || !job.title || !studentRole.test(job.title) || advancedOnly.test(job.title) ||
          !isUsLocation(job.location?.name ?? "", job.title)) return [];
      const sourceUrl = safeJobUrl(job.absolute_url, "greenhouse");
      if (!sourceUrl) return [];
      const description = cleanText(job.content ?? "");
      const location = job.location?.name?.slice(0, 160) ?? null;
      const remoteType = /remote/i.test(`${location ?? ""} ${job.title}`) ? "REMOTE" : /hybrid/i.test(`${location ?? ""} ${job.title}`) ? "HYBRID" : "ONSITE";
      return [makeRecord({ sourceId: `${boardId}:${job.id}`, title: job.title, organization: board.name,
        description, location, remoteType, postedDate: null, sourceUrl, applicationUrl: sourceUrl, verifiedAt })];
    });
  }
  if (!Array.isArray(data)) throw new Error(`${boardId} returned an invalid job list`);
  return data.flatMap((raw) => {
    const job = raw as LeverJob;
    if (!job.id || !job.text || !studentRole.test(`${job.text} ${job.categories?.commitment ?? ""}`) || advancedOnly.test(job.text) ||
        (job.country ? job.country !== "US" : !isUsLocation(job.categories?.location ?? "", job.text))) return [];
    const sourceUrl = safeJobUrl(job.hostedUrl, "lever");
    if (!sourceUrl) return [];
    const applicationUrl = safeJobUrl(job.applyUrl, "lever") ?? sourceUrl;
    const location = job.categories?.location?.slice(0, 160) ?? null;
    const workplace = job.workplaceType?.toLowerCase();
    const remoteType = workplace === "remote" ? "REMOTE" : workplace === "hybrid" ? "HYBRID" : "ONSITE";
    return [makeRecord({ sourceId: `${boardId}:${job.id}`, title: job.text, organization: board.name,
      description: cleanText(job.descriptionPlain ?? ""), location, remoteType,
      postedDate: isoDate(job.createdAt), sourceUrl, applicationUrl, verifiedAt })];
  });
}
