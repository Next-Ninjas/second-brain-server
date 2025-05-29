import "dotenv/config";
import { serve } from "@hono/node-server";

import { Hono } from "hono";
import { allRoutes } from "./routes/routes.js";

const app = new Hono();

app.route("/", allRoutes);


serve(app, ({ port }) => {
  console.log(`\tRunning at http://localhost:${port}`);
});

