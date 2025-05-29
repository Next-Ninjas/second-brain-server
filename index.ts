import "dotenv/config";
import { serve } from "@hono/node-server";
import { allRoutes } from "./src/routes/routes.ts";
import { Hono } from "hono";

const app = new Hono();

app.route("/", allRoutes);
serve(app);
