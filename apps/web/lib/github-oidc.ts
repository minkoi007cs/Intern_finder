import "server-only";
import { createPublicKey, verify } from "node:crypto";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "https://intern.minkoi.org/api/ingest/jobs";
const WORKFLOW = "minkoi007cs/Intern_finder/.github/workflows/sync-jobs.yml@refs/heads/main";

type Claims = Record<string, unknown>;
type Jwk = JsonWebKey & { kid?: string; kty?: string; use?: string };

function decodePart<T>(part: string): T | null {
  try { return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T; }
  catch { return null; }
}

/** Accept only a signed GitHub Actions token from our default-branch sync workflow. */
export async function isAuthorizedSync(request: Request): Promise<boolean> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const token = authorization.slice(7);
  if (token.length > 12_000) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const header = decodePart<{ alg?: string; kid?: string }>(parts[0]);
  const claims = decodePart<Claims>(parts[1]);
  if (header?.alg !== "RS256" || !header.kid || !claims) return false;
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== ISSUER || claims.aud !== AUDIENCE ||
      claims.repository !== "minkoi007cs/Intern_finder" ||
      claims.ref !== "refs/heads/main" || claims.workflow_ref !== WORKFLOW ||
      !["schedule", "workflow_dispatch"].includes(String(claims.event_name)) ||
      typeof claims.exp !== "number" || claims.exp <= now ||
      typeof claims.iat !== "number" || claims.iat > now + 60 || now - claims.iat > 900 ||
      (typeof claims.nbf === "number" && claims.nbf > now + 60)) return false;
  try {
    const response = await fetch(`${ISSUER}/.well-known/jwks`, { cache: "force-cache", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return false;
    const body = await response.json() as { keys?: Jwk[] };
    const key = body.keys?.find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA" && (!candidate.use || candidate.use === "sig"));
    if (!key) return false;
    return verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key, format: "jwk" }), Buffer.from(parts[2], "base64url"));
  } catch { return false; }
}
