import "dotenv/config";
import { serve } from "@hono/node-server";

import { Hono } from "hono";
import { allRoutes } from "./routes/routes.js";

const app = new Hono();

app.route("/", allRoutes);

app.get("/", async (context) => {
  return context.json({
    message: "hello welcome to neuronote",
  });
});

serve(app, ({ port }) => {
  console.log(`\tRunning at http://localhost:${port}`);
});

