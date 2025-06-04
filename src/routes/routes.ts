import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { webClientUrl } from "../utils/environment/index.js";
import { authenticationsRoute } from "./authentications/index.js";
import memoryRoutes from "./memories/index.js";
import chatRoutes from "./rag/index.js";
import { userRoute } from "./user/user-route.js";
import { createSecureRoute } from "./middlewares/session-middleware.js";
import { prismaClient } from "../integration/prisma/prisma.js";

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
export const dashboardRoute = createSecureRoute();

dashboardRoute.get("/dashboard", async (context) => {
  const user = context.get("user");
  const userId = user?.id;

  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const { q: query = "", limit = "10", offset = "0" } = context.req.query();

  const searchResults = await prismaClient.memory.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
        { tags: { hasSome: query.split(" ") } }, // Optional: tag match
      ],
    },
    take: parseInt(limit),
    skip: parseInt(offset),
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      content: true,
      tags: true,
      url: true,
      isFavorite: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return context.json({
    success: true,
    data: searchResults,
    meta: {
      count: searchResults.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
});

allRoutes.route("/auth", authenticationsRoute);
allRoutes.route("/memories", memoryRoutes);
allRoutes.route("/", chatRoutes);
allRoutes.route("/user", userRoute);
allRoutes.route("/search", dashboardRoute);
