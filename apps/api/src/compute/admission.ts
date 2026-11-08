import type { AfribitChatResponse } from "@afribit/shared";
import { AsyncLocalStorage } from "node:async_hooks";
import { getPack } from "../pack/active.js";
import { computeStore } from "./store.js";
import { ComputePolicyError, selectRoute, validateComputePolicy, type ComputeTarget, type ComputeRoute, type ComputePolicy } from "./policy.js";
export interface ComputeAccounting {
    reserve(route: ComputeRoute): Promise<string>;
    finish(id: string, status: "completed" | "failed" | "cancelled", cost: number | null): Promise<void>;
}
const isolated = new AsyncLocalStorage<{ policy: ComputePolicy; accounting: ComputeAccounting }>();
/** CLI-only policy, independent of the application DB. Cannot replace installed API enforcement. */
export function withIsolatedComputePolicy<T>(policy: ComputePolicy, accounting: ComputeAccounting, work: () => T): T {
    if (enforced || isolated.getStore()) throw new Error("Isolated compute scope cannot replace API or nested enforcement");
    const copy = validateComputePolicy(policy);
    for (const route of copy.routes) { Object.freeze(route.upstreams); Object.freeze(route); }
    Object.freeze(copy.routes); Object.freeze(copy);
    return isolated.run({ policy: copy, accounting }, work);
}
let enforced = false;
/** The API installs this before accepting requests. Trusted CLI tools must opt in separately. */
export function enforceComputePolicies(value = true): boolean { const previous = enforced; enforced = value; return previous; }
function boundFrame(frame: unknown, maxOutputTokens: number) {
    if (Buffer.byteLength(JSON.stringify(frame), "utf8") > 131072 || !Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 0 || maxOutputTokens > 4096
        || (Array.isArray((frame as {
            messages?: unknown;
        })?.messages) && ((frame as {
            messages: unknown[];
        }).messages.length > 64)))
        throw new ComputePolicyError(413, "Compute context or output exceeds the service limit");
}
async function admit(target: ComputeTarget, frame: unknown, maxOutputTokens: number) {
    boundFrame(frame, maxOutputTokens);
    const cli = isolated.getStore();
    if (cli) {
        if (enforced) throw new Error("Isolated compute scope cannot replace API enforcement");
        const route = selectRoute(cli.policy, target, frame, maxOutputTokens);
        return { id: await cli.accounting.reserve(route), route, accounting: cli.accounting };
    }
    if (!enforced)
        return null;
    const pack = getPack().id, state = await computeStore.read(pack);
    if (!state.enabled || !state.policy)
        throw new ComputePolicyError(403, "Community compute is disabled until its policy is configured");
    const policy = validateComputePolicy(state.policy), route = selectRoute(policy, target, frame, maxOutputTokens);
    const id = await computeStore.reserve(pack, state.version, policy, route);
    return { id, route, accounting: { finish: computeStore.finish } };
}
async function finish(permit: Awaited<ReturnType<typeof admit>>, status: "completed" | "failed" | "cancelled", cost: number | null) {
    if (!permit)
        return;
    try {
        await permit.accounting.finish(permit.id, status, cost);
    }
    catch {
        console.warn("[compute] Settlement failed; the full allowance reservation remains charged");
    }
}
export async function computeCall<T>(target: ComputeTarget, frame: unknown, maxOutputTokens: number, work: (route: ComputeRoute | null) => Promise<T>, cost: (result: T) => number | null = () => null): Promise<T> {
    const permit = await admit(target, frame, maxOutputTokens);
    try {
        const result = await work(permit?.route ?? null);
        await finish(permit, "completed", cost(result));
        return result;
    }
    catch (error) {
        await finish(permit, "failed", null);
        throw error;
    }
}
export async function* computeStream(target: ComputeTarget, frame: unknown, maxOutputTokens: number, work: (route: ComputeRoute | null) => AsyncGenerator<string, AfribitChatResponse, void>): AsyncGenerator<string, AfribitChatResponse, void> {
    const permit = await admit(target, frame, maxOutputTokens);
    let settled = false;
    try {
        const result = yield* work(permit?.route ?? null);
        await finish(permit, "completed", result.estimatedCostUsd);
        settled = true;
        return result;
    }
    catch (error) {
        await finish(permit, "failed", null);
        settled = true;
        throw error;
    }
    finally {
        if (!settled)
            await finish(permit, "cancelled", null);
    }
}
export function openRouterPreferences(route: ComputeRoute | null): Record<string, unknown> {
    if (!route)
        return {};
    return {
        only: route.upstreams, order: route.upstreams, allow_fallbacks: false, require_parameters: true, zdr: true, data_collection: "deny",
        max_price: { prompt: route.promptPriceMicrousdPerMillion / 1000000, completion: route.completionPriceMicrousdPerMillion / 1000000 }
    };
}
