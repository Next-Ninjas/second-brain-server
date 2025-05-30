import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { webClientUrl } from "../utils/environment/index.js";
import { authenticationsRoute } from "./authentications/index.js";
import memoryRoutes from "./memories/index.js";
import chatRoutes from "./rag/index.js";
import { userRoute } from "./user/user-route.js";


export const allRoutes = new Hono();

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
allRoutes.route("/", chatRoutes);
allRoutes.route("/user", userRoute);



