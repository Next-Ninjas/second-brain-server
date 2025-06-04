import { Hono } from "hono";
import { prismaClient as prisma } from "../../integration/prisma/prisma.js";
import { createSecureRoute } from "../middlewares/session-middleware.js";

export const dashboardRoute = createSecureRoute();

dashboardRoute.get("/search", async (context) => {
  const user = context.get("user");
  const userId = user?.id;

  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const { q: query = "", limit = "10", offset = "0" } = context.req.query();

  const searchResults = await prisma.memory.findMany({
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
