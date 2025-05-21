import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { webClientUrl } from "./utils/environment/index.js";

const allRoutes = new Hono();

allRoutes.use(
  cors({
    origin: webClientUrl,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    exposeHeaders: ["Content-Length"],
    credentials: true,
    maxAge: 600,
  }),
);


serve(allRoutes, ({ port }) => {
  console.log(`\tRunning at http://localhost:${port}`);
});
