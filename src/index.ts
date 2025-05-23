import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { webClientUrl } from "./utils/environment/index.js";
import { authenticationsRoute } from "./routes/authentications/index.js";
import memoryRoutes from "./routes/memories/index.js";


const allRoutes = new Hono();

allRoutes.use(
  cors({
    origin: webClientUrl,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    exposeHeaders: ["Content-Length"],
    credentials: true,
    maxAge: 600,
  })
);

allRoutes.route("/auth", authenticationsRoute);
allRoutes.route("/memories", memoryRoutes);

allRoutes.get("/", async (context) => {
  return context.json({
    message: "hello",
  });
});

serve(allRoutes, ({ port }) => {
  console.log(`\tRunning at http://localhost:${port}`);
});
