import { isOnThisMachine } from "../privacy/location.js";
export class ComputePolicyError extends Error {
    constructor(public statusCode: number, message: string) { super(message); }
}
export interface ComputeRoute {
    kind: "chat" | "embeddings";
    provider: "local" | "openrouter";
    model: string;
    baseUrl: string;
    region: "community" | "unrestricted" | "eu" | "us";
    maxInputBytes: number;
    maxOutputTokens: number;
    reservationMicrousd: number;
    billingBoundConfirmed: boolean;
    upstreams: string[];
    promptPriceMicrousdPerMillion: number;
    completionPriceMicrousdPerMillion: number;
}
export interface ComputePolicy {
    dailyBudgetMicrousd: number;
    dailyAttemptLimit: number;
    routes: ComputeRoute[];
}
export interface ComputeTarget {
    kind: "chat" | "embeddings";
    provider: "local" | "openrouter";
    model: string;
    baseUrl: string;
}
export function normalizedBase(value: string): string {
    const u = new URL(value);
    if (u.username || u.password || u.search || u.hash || !["https:", "http:"].includes(u.protocol))
        throw new Error("Invalid endpoint");
    if (u.protocol !== "https:" && !isOnThisMachine(value))
        throw new Error("Remote endpoints require HTTPS");
    return u.toString().replace(/\/+$/, "");
}
const integer = (value: unknown, max: number) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max;
function fail(): never { throw new ComputePolicyError(400, "Invalid compute policy. Check routes, limits, endpoint, region and billing bounds."); }
export function validateComputePolicy(value: unknown): ComputePolicy {
    if (!value || typeof value !== "object")
        return fail();
    const p = value as ComputePolicy;
    if (Object.keys(p).some(k => !["dailyBudgetMicrousd", "dailyAttemptLimit", "routes"].includes(k)) || !integer(p.dailyBudgetMicrousd, 1000000000) || !integer(p.dailyAttemptLimit, 100000) || !Array.isArray(p.routes) || p.routes.length > 32)
        return fail();
    const keys = ["kind", "provider", "model", "baseUrl", "region", "maxInputBytes", "maxOutputTokens", "reservationMicrousd", "billingBoundConfirmed", "upstreams", "promptPriceMicrousdPerMillion", "completionPriceMicrousdPerMillion"];
    const routes = p.routes.map((r) => {
        if (!r || typeof r !== "object" || Object.keys(r).some(k => !keys.includes(k)) || !["chat", "embeddings"].includes(r.kind) || !["local", "openrouter"].includes(r.provider)
            || typeof r.model !== "string" || !r.model || r.model.length > 160 || /[\s@]/.test(r.model) || r.model.startsWith("openrouter/") || typeof r.baseUrl !== "string"
            || !["community", "unrestricted", "eu", "us"].includes(r.region) || !integer(r.maxInputBytes, 131072) || r.maxInputBytes < 256
            || !integer(r.maxOutputTokens, 4096) || (r.kind === "chat" ? r.maxOutputTokens < 1 : r.maxOutputTokens !== 0)
            || !integer(r.reservationMicrousd, 1000000000) || typeof r.billingBoundConfirmed !== "boolean" || !Array.isArray(r.upstreams) || r.upstreams.length > 8
            || r.upstreams.some(s => typeof s !== "string" || !s || s.length > 100 || !/^[a-zA-Z0-9._/-]+$/.test(s))
            || !integer(r.promptPriceMicrousdPerMillion, 1000000000) || !integer(r.completionPriceMicrousdPerMillion, 1000000000))
            return fail();
        let baseUrl: string;
        try {
            baseUrl = normalizedBase(r.baseUrl);
        }
        catch {
            return fail();
        }
        const onMachine = r.provider === "local" && isOnThisMachine(baseUrl);
        if (onMachine) {
            if (r.region !== "community" || r.reservationMicrousd !== 0)
                return fail();
        }
        else {
            if (!r.billingBoundConfirmed || r.reservationMicrousd < 1 || r.region === "community")
                return fail();
            if (r.provider === "openrouter") {
                // Hosted embeddings have no verified upstream-pinning/price adapter in this slice.
                if (r.kind !== "chat" || !r.upstreams.length)
                    return fail();
                if (r.region !== "unrestricted" && baseUrl !== `https://${r.region}.openrouter.ai/api/v1`)
                    return fail();
                const required = (BigInt(r.maxInputBytes + 16384) * BigInt(r.promptPriceMicrousdPerMillion) + BigInt(r.maxOutputTokens) * BigInt(r.completionPriceMicrousdPerMillion) + 999999n) / 1000000n;
                if (BigInt(r.reservationMicrousd) < required)
                    return fail();
            }
            else if (r.region !== "unrestricted")
                return fail();
        }
        return { ...r, baseUrl, upstreams: [...r.upstreams] };
    });
    if (new Set(routes.map(r => JSON.stringify([r.kind, r.provider, r.model, r.baseUrl]))).size !== routes.length)
        return fail();
    return { dailyBudgetMicrousd: p.dailyBudgetMicrousd, dailyAttemptLimit: p.dailyAttemptLimit, routes };
}
export function selectRoute(policy: ComputePolicy, target: ComputeTarget, frame: unknown, maxOutputTokens: number): ComputeRoute {
    let baseUrl: string;
    try {
        baseUrl = normalizedBase(target.baseUrl);
    }
    catch {
        throw new ComputePolicyError(403, "Compute endpoint is not permitted");
    }
    const route = policy.routes.find(r => r.kind === target.kind && r.provider === target.provider && r.model === target.model && r.baseUrl === baseUrl);
    if (!route)
        throw new ComputePolicyError(403, "This provider, model or endpoint is not allowed for this community");
    if (Buffer.byteLength(JSON.stringify(frame), "utf8") > route.maxInputBytes)
        throw new ComputePolicyError(413, "Compute context exceeds this community's input limit");
    if (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 0 || maxOutputTokens > route.maxOutputTokens)
        throw new ComputePolicyError(413, "Compute output exceeds this community's limit");
    return route;
}
