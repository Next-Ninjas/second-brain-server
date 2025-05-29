import "dotenv/config";
import { serve } from "@hono/node-server";

import { Hono } from "hono";
import { allRoutes } from "./src/routes/routes.js";

const app = new Hono();

app.route("/", allRoutes);
serve(app);
