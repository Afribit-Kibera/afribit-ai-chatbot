import type { FastifyInstance } from "fastify";
import { communityStore } from "../community/store.js";
import { getPack } from "../pack/active.js";
import { computeStore } from "../compute/store.js";
export function registerComputeRoutes(app: FastifyInstance) {
    const admin = { preHandler: [app.requireAuth, async (req: Parameters<typeof app.requireAuth>[0]) => communityStore.requireAdmin(req.user.id)] };
    app.get("/api/v1/admin/community/compute", admin, async (_req, reply) => {
        reply.header("Cache-Control", "no-store");
        const pack = getPack().id;
        return { ...await computeStore.read(pack), usage: await computeStore.usage(pack) };
    });
    app.put<{
        Body: {
            expectedVersion: number;
            enabled: boolean;
            policy: unknown;
        };
    }>("/api/v1/admin/community/compute", admin, async (req, reply) => {
        reply.header("Cache-Control", "no-store");
        const b = req.body;
        return computeStore.save(getPack().id, req.user.id, b?.expectedVersion, b?.enabled, b?.policy);
    });
}
