import { NextResponse, type NextRequest } from "next/server";
import cityData from "@/data/us_cities.json";

export const dynamic = "force-dynamic";
const attribution = "City data © GeoNames (geonames.org), CC BY 4.0";
const normalize = (text: string) => text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\./g, "").trim().replace(/\s+/g, " ");

export function GET(request: NextRequest): Response {
  const raw = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const [cityPart, statePart] = raw.split(",", 2);
  const city = normalize(cityPart ?? "");
  const state = statePart ? normalize(statePart) : null;
  const limit = Math.min(8, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 8) || 8));
  if (city.length < 2) return NextResponse.json({ items: [], attribution });
  const states = Object.entries(cityData.states);
  const stateCodes = state ? new Set(states.filter(([code, name]) => normalize(code).startsWith(state) || normalize(name).startsWith(state)).map(([code]) => code)) : null;
  const matches = cityData.cities
    .filter(([name, code]) => normalize(String(name)).startsWith(city) && (stateCodes === null || stateCodes.has(String(code))))
    .sort((a, b) => Number(normalize(String(a[0])) !== city) - Number(normalize(String(b[0])) !== city) || Number(b[4]) - Number(a[4]))
    .slice(0, limit)
    .map(([name, code, latitude, longitude]) => ({ label: `${name}, ${code}`, city: name, state: code, latitude, longitude }));
  return NextResponse.json({ items: matches, attribution });
}
