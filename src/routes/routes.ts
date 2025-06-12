import { Hono } from "hono";
import { cors } from "hono/cors";
import { webClientUrl } from "../utils/environment/index.js";
import { authenticationsRoute } from "./authentications/index.js";
import { userRoute } from "./user/user-route.js";
import { dashboardRoute } from "./search/index.js";
import chatRoutesmistral from "./rag/index.js";
import memoryRoutes from "./memories/index.js";
import { chatRoutes } from "./chat/index.js";
import { memoryRoute } from "./memory/index.js";
import { tagRoutes } from "./tag/index.js";

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
allRoutes.route("/chats", chatRoutes);
allRoutes.route("/profile", userRoute);
allRoutes.route("/dashboard", dashboardRoute);
allRoutes.route("/ai", chatRoutesmistral);
allRoutes.route("/dashboard/memories",memoryRoute);
allRoutes.route("/tags",tagRoutes);