import { pool } from "../db/pool.js";
import { ComputePolicyError, validateComputePolicy, type ComputePolicy, type ComputeRoute } from "./policy.js";
export const computeStore = {
    async read(pack: string) {
        const { rows } = await pool.query<{
            enabled: boolean;
            policy: ComputePolicy;
            version: number;
        }>(`SELECT enabled,policy,version FROM community_compute_policies WHERE pack_id=$1`, [pack]);
        return rows[0] ?? { enabled: false, policy: null, version: 0 };
    },
    async save(pack: string, actor: string, expectedVersion: number, enabled: boolean, value: unknown) {
        const policy = validateComputePolicy(value);
        if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || typeof enabled !== "boolean")
            throw new ComputePolicyError(400, "Explicit policy version and enabled state are required");
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const { rows } = expectedVersion === 0 ? await client.query(`INSERT INTO community_compute_policies(pack_id,enabled,policy,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING version`, [pack, enabled, JSON.stringify(policy), actor])
                : await client.query(`UPDATE community_compute_policies SET enabled=$2,policy=$3,updated_by=$4,version=version+1,updated_at=now() WHERE pack_id=$1 AND version=$5 RETURNING version`, [pack, enabled, JSON.stringify(policy), actor, expectedVersion]);
            if (!rows[0])
                throw new ComputePolicyError(409, "Compute policy changed; reload before saving");
            await client.query(`INSERT INTO audit_logs(actor,action,entity_type,details) VALUES($1,'compute_policy_changed','compute',$2)`, [actor, JSON.stringify({ packId: pack, version: rows[0].version, enabled, routeCount: policy.routes.length, dailyBudgetMicrousd: policy.dailyBudgetMicrousd, dailyAttemptLimit: policy.dailyAttemptLimit })]);
            await client.query("COMMIT");
            return { version: rows[0].version };
        }
        catch (e) {
            await client.query("ROLLBACK");
            throw e;
        }
        finally {
            client.release();
        }
    },
    async usage(pack: string) {
        const { rows } = await pool.query(`SELECT day::text,attempts,reserved_microusd::text AS "reservedMicrousd" FROM community_compute_usage WHERE pack_id=$1 AND day=(now() AT TIME ZONE 'UTC')::date`, [pack]);
        return rows[0] ?? { day: null, attempts: 0, reservedMicrousd: "0" };
    },
    async reserve(pack: string, version: number, policy: ComputePolicy, route: ComputeRoute) {
        const { rows } = await pool.query<{
            id: string;
        }>(`WITH allowed AS MATERIALIZED (
      SELECT pack_id FROM community_compute_policies WHERE pack_id=$1 AND enabled AND version=$2 FOR SHARE),
      bucket AS (INSERT INTO community_compute_usage(pack_id,day,attempts,reserved_microusd)
        SELECT pack_id,(now() AT TIME ZONE 'UTC')::date,1,$3 FROM allowed WHERE $4::int>0 AND $3::bigint<=$5::bigint
        ON CONFLICT(pack_id,day) DO UPDATE SET attempts=community_compute_usage.attempts+1,reserved_microusd=community_compute_usage.reserved_microusd+$3
        WHERE community_compute_usage.attempts<$4 AND community_compute_usage.reserved_microusd+$3<=$5 RETURNING pack_id,day)
      INSERT INTO community_compute_reservations(pack_id,day,policy_version,provider,model,kind,reserved_microusd,endpoint_base_url,region,upstreams,max_input_bytes,max_output_tokens)
      SELECT pack_id,day,$2,$6,$7,$8,$3,$9,$10,$11::jsonb,$12,$13 FROM bucket RETURNING id`, [pack, version, route.reservationMicrousd, policy.dailyAttemptLimit, policy.dailyBudgetMicrousd, route.provider, route.model, route.kind, route.baseUrl, route.region, JSON.stringify(route.upstreams), route.maxInputBytes, route.maxOutputTokens]);
        if (!rows[0])
            throw new ComputePolicyError(429, "Community compute allowance is exhausted or its policy changed");
        return rows[0].id;
    },
    async finish(id: string, status: "completed" | "failed" | "cancelled", costUsd: number | null) {
        const cost = costUsd !== null && Number.isFinite(costUsd) && costUsd >= 0 ? Math.ceil(costUsd * 1000000) : null;
        await pool.query(`WITH finished AS (
      UPDATE community_compute_reservations SET status=CASE WHEN $3::numeric>reserved_microusd THEN 'overrun' ELSE $2 END,
        reported_microusd=$3,finished_at=now() WHERE id=$1 AND status='reserved' RETURNING pack_id,status),
      stopped AS (UPDATE community_compute_policies p SET enabled=false,version=version+1,updated_at=now()
        FROM finished f WHERE p.pack_id=f.pack_id AND f.status='overrun' RETURNING p.pack_id)
      INSERT INTO audit_logs(actor,action,entity_type,details) SELECT 'compute-meter','compute_billing_overrun','compute',jsonb_build_object('packId',pack_id) FROM stopped`, [id, status, cost]);
    },
};
