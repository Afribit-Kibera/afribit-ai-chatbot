import Fastify from "fastify";
import cors from "@fastify/cors";
import { env, assertProductionEnv } from "./config/env.js";
import { createGateway } from "./gateway/registry.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerPreferenceRoutes } from "./routes/preferences.js";
import { registerKnowledgeRoutes } from "./routes/knowledge.js";
import { registerNotificationRoutes } from "./routes/notifications.js";

assertProductionEnv();

const app = Fastify({ logger: true });
const gateway = createGateway();

await app.register(cors, { origin: env.corsOrigin });

app.get("/health", async () => ({ ok: true }));
app.get("/health/providers", async () => gateway.healthCheckAll());

registerChatRoutes(app, gateway);
registerPreferenceRoutes(app);
registerKnowledgeRoutes(app);
registerNotificationRoutes(app);

app.listen({ port: env.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Afribit AI API listening at ${address}`);
});
