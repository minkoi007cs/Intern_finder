import "server-only";
import { hubQuery } from "./hub";
import { fetchBoard, type BoardId, type LiveRecord } from "./job-sources";

const COLUMNS = 8;
const UPSERT = `INSERT INTO opportunities
  (id, owner_id, title, organization, opportunity_type, remote_type, deadline, is_demo, details_json)
  VALUES %VALUES%
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, organization = EXCLUDED.organization,
    opportunity_type = EXCLUDED.opportunity_type, remote_type = EXCLUDED.remote_type,
    deadline = EXCLUDED.deadline, details_json = EXCLUDED.details_json
  WHERE opportunities.is_demo = false`;

async function writeBatch(records: LiveRecord[]): Promise<void> {
  const placeholders = records.map((_, index) => {
    const start = index * COLUMNS;
    return `($${start + 1}::uuid, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6}, $${start + 7}::date, false, $${start + 8})`;
  }).join(", ");
  const params = records.flatMap((item) => [
    item.opportunity.id, "source:intern-finder-sync", item.opportunity.title, item.opportunity.organization,
    item.opportunity.opportunity_type, item.opportunity.remote_type, item.opportunity.deadline,
    JSON.stringify(item),
  ]);
  await hubQuery(UPSERT.replace("%VALUES%", placeholders), params);
}

async function retireMissing(boardId: BoardId, records: LiveRecord[]): Promise<void> {
  const placeholders = records.map((_, index) => `$${index + 3}::uuid`).join(", ");
  const sql = `UPDATE opportunities
    SET details_json = jsonb_set(details_json::jsonb, '{last_verified_at}', to_jsonb('1970-01-01T00:00:00.000Z'::text))::text
    WHERE owner_id = $1 AND is_demo = false AND details_json::jsonb->>'source_id' LIKE $2
    ${records.length ? `AND id NOT IN (${placeholders})` : ""}`;
  await hubQuery(sql, ["source:intern-finder-sync", `${boardId}:%`, ...records.map((item) => item.opportunity.id)]);
}

export async function syncBoard(boardId: BoardId): Promise<{ source: string; found: number; stored: number }> {
  const records = await fetchBoard(boardId);
  for (let index = 0; index < records.length; index += 10) await writeBatch(records.slice(index, index + 10));
  await retireMissing(boardId, records);
  return { source: boardId, found: records.length, stored: records.length };
}
