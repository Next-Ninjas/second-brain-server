import { createSecureRoute } from "../middlewares/session-middleware.js";
import { prismaClient } from "../../integration/prisma/prisma.js";

export const tagRoutes = createSecureRoute();

tagRoutes.get("/me/all", async (c) => {
  const user = c.get("user");

  const memories = await prismaClient.memory.findMany({
    where: {
      userId: user.id,
    },
    select: {
      tags: true,
    },
  });

  // Flatten and deduplicate tags
  const allTags = Array.from(
    new Set(memories.flatMap((m) => m.tags || []))
  );

  return c.json({
    success: true,
    tags: allTags,
    count: allTags.length,
  });
});



tagRoutes.get("/search", async (c) => {
  const user = c.get("user");
  const { q } = c.req.query();

  if (!q || q.trim() === "") {
    return c.json({ success: false, message: "Query parameter 'q' is required." }, 400);
  }

  const tags = q.split(",").map((tag) => tag.trim()).filter(Boolean);

  if (tags.length === 0) {
    return c.json({ success: false, message: "No valid tags provided." }, 400);
  }

  const matchedMemories = await prismaClient.memory.findMany({
    where: {
      userId: user.id,
      tags: {
        hasSome: tags, // Matches if memory contains any of the tags
      },
    },
  });

  return c.json({
    success: true,
    tags,
    count: matchedMemories.length,
    results: matchedMemories,
  });
});
