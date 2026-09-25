/**
 * Server-only: sign-in through the app_system hub.
 *
 * The browser never sees a token or a key. The session (access + refresh token) lives in one
 * httpOnly cookie on this app's domain; the secret key (sk_) is read from a server env var and is
 * only ever sent to the hub, server to server. Do not import this file from a "use client" module.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export type TokenPair = { accessToken: string; refreshToken: string; expiresAt: number };
export type SignInFlow = { state: string; codeVerifier: string; next: string };

export const SESSION_COOKIE = "oos_session";
export const FLOW_COOKIE = "oos_signin";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const FLOW_MAX_AGE = 60 * 10;
/** Refresh when less than this is left on the access token. */
export const REFRESH_WINDOW_MS = 120_000;
const PROVIDERS = new Set(["google", "github", "microsoft"]);

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`[opportunityos] ${name} is not set — see .env.example`);
  return value;
}

export function hubConfig() {
  const secretKey = required("INFRA_SECRET_KEY");
  const publishableKey = required("NEXT_PUBLIC_INFRA_PUBLISHABLE_KEY");
  if (!secretKey.startsWith("sk_")) throw new Error("[opportunityos] INFRA_SECRET_KEY must be an sk_ key");
  if (!publishableKey.startsWith("pk_")) throw new Error("[opportunityos] NEXT_PUBLIC_INFRA_PUBLISHABLE_KEY must be a pk_ key");
  return {
    hubUrl: required("NEXT_PUBLIC_INFRA_URL").replace(/\/+$/, ""),
    publishableKey,
    secretKey,
    appUrl: (process.env.APP_URL ?? "http://localhost:3002").replace(/\/+$/, ""),
  };
}

export function callbackUri(): string {
  return `${hubConfig().appUrl}/auth/callback`;
}

/** Where the FastAPI backend lives, seen from this server. */
export function backendUrl(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");
}

const b64url = (buf: Buffer) => buf.toString("base64url");

/** Only a path on this app — never `//evil.example` or an absolute URL. */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

export function authorizeRequest(provider: string | null, next: string): { url: string; flow: SignInFlow } {
  const c = hubConfig();
  const codeVerifier = b64url(randomBytes(32));
  const state = b64url(randomBytes(24));
  const url = new URL("/authorize", c.hubUrl + "/");
  url.searchParams.set("client_id", c.publishableKey);
  url.searchParams.set("redirect_uri", callbackUri());
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", b64url(createHash("sha256").update(codeVerifier).digest()));
  url.searchParams.set("code_challenge_method", "S256");
  if (provider !== null && PROVIDERS.has(provider)) url.searchParams.set("provider", provider);
  return { url: url.toString(), flow: { state, codeVerifier, next: safeNext(next) } };
}

export function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

type HubResult = { ok: true; body: unknown } | { ok: false; status: number; code: string };

async function hubPost(path: string, body: unknown): Promise<HubResult> {
  const c = hubConfig();
  try {
    const response = await fetch(`${c.hubUrl}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${c.secretKey}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const parsed: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = (parsed as { error?: { code?: string } } | null)?.error;
      return { ok: false, status: response.status, code: error?.code ?? `HTTP_${response.status}` };
    }
    const data = parsed !== null && typeof parsed === "object" && "data" in parsed ? (parsed as { data: unknown }).data : parsed;
    return { ok: true, body: data };
  } catch {
    return { ok: false, status: 0, code: "NETWORK_ERROR" };
  }
}

function toPair(body: unknown): TokenPair | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const accessToken = b.accessToken ?? b.access_token;
  const refreshToken = b.refreshToken ?? b.refresh_token;
  const expiresIn = Number(b.expiresIn ?? b.expires_in ?? 600);
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") return null;
  return { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000 };
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<TokenPair | null> {
  const result = await hubPost("/api/v1/auth/token", {
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: callbackUri(),
  });
  return result.ok ? toPair(result.body) : null;
}

/**
 * One refresh. The hub rotates refresh tokens and treats a replayed one as theft (it revokes the
 * whole session family), so callers must make sure only one refresh runs per token.
 *   pair     → new tokens
 *   terminal → the session is over (revoked, expired, reused)
 *   neither  → hub unreachable; keep the old cookie and try again later
 */
export async function refreshPair(refreshToken: string): Promise<{ pair: TokenPair | null; terminal: boolean }> {
  const result = await hubPost("/api/v1/auth/refresh", { refresh_token: refreshToken });
  if (result.ok) {
    const pair = toPair(result.body);
    return { pair, terminal: pair === null };
  }
  return { pair: null, terminal: result.status === 401 || result.status === 400 };
}

export async function revoke(refreshToken: string): Promise<void> {
  await hubPost("/api/v1/auth/revoke", { refresh_token: refreshToken });
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decode(value: string | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function decodeSession(value: string | undefined): TokenPair | null {
  const p = decode(value);
  if (p === null || typeof p.accessToken !== "string" || typeof p.refreshToken !== "string" || typeof p.expiresAt !== "number") return null;
  return { accessToken: p.accessToken, refreshToken: p.refreshToken, expiresAt: p.expiresAt };
}

export function decodeFlow(value: string | undefined): SignInFlow | null {
  const p = decode(value);
  if (p === null || typeof p.state !== "string" || typeof p.codeVerifier !== "string") return null;
  return { state: p.state, codeVerifier: p.codeVerifier, next: safeNext(p.next) };
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge,
  };
}

export function setSession(response: NextResponse, pair: TokenPair): void {
  response.cookies.set(SESSION_COOKIE, encode(pair), cookieOptions(SESSION_MAX_AGE));
}

export function setFlow(response: NextResponse, flow: SignInFlow): void {
  response.cookies.set(FLOW_COOKIE, encode(flow), cookieOptions(FLOW_MAX_AGE));
}
