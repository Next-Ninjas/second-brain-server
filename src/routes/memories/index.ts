import { zValidator } from "@hono/zod-validator";

import { prismaClient } from "../../integration/prisma/prisma.js";
import { createSecureRoute } from "../middlewares/session-middleware.js";
import { memorySchema, partialMemorySchema } from "../../validators/memory.js";
import { Pinecone } from "@pinecone-database/pinecone";
import { pineconeApiKey } from "../../utils/environment/index.js";
import { pc } from "../../lib/pinecone.js";





const memoryRoutes = createSecureRoute();


memoryRoutes.post("/", zValidator("json", memorySchema), async (c) => {
  const user = c.get("user");
  const body = await c.req.json();

  const memory = await prismaClient.memory.create({
    data: {
      userId: user.id,
      content: body.content,
      title: body.title,
      tags: body.tags || [],
      isFavorite: body.isFavorite ?? false,
    },
  });

  const index = pc.index("memories");
  const namespace = index.namespace(user.id); 

  const records = [
    {
      id: memory.id,
      text: memory.content,
      title: memory.title || "",
    },
  ];

  await namespace.upsertRecords(records);

  return c.json(memory);
});


//to get all memories 
memoryRoutes.get("/", async (c) => {
  const user = c.get("user");

  const memories = await prismaClient.memory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return c.json(memories);
});

// to get recent 5 memories
memoryRoutes.get("/recent", async (c) => {
  const user = c.get("user");
  const { limit = "5" } = c.req.query(); // Default limit to 5 if not provided

  const parsedLimit = parseInt(limit);
  const safeLimit = isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;

  const memories = await prismaClient.memory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });

  return c.json(memories);
});


// ✅ GET single memory


memoryRoutes.put("/:id", zValidator("json", memorySchema), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();

  const updated = await prismaClient.memory.updateMany({
    where: { id, userId: user.id },
    data: {
      content: body.content,
      title: body.title,
      tags: body.tags || [],
      url: body.url,
      isFavorite: body.isFavorite ?? false,
    },
  });

  if (updated.count === 0) return c.notFound();

  // Pinecone integration
  const index = pc.index("memories");
  const namespace = index.namespace(user.id);
  const records = [
    {
      id,
      text: body.content,
      title: body.title || "",
     
    },
  ];
  await namespace.upsertRecords(records);

  return c.json({ success: true });
});

memoryRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const deleted = await prismaClient.memory.deleteMany({
    where: { id, userId: user.id },
  });

  if (deleted.count === 0) return c.notFound();


  const index = pc.index("memories");
  const namespace = index.namespace(user.id);
  await namespace.deleteOne(id);

  return c.json({ success: true });
});


memoryRoutes.patch("/:id", zValidator("json", partialMemorySchema), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();

  // Perform update using Prisma
  const updated = await prismaClient.memory.updateMany({
    where: { id, userId: user.id },
    data: {
      // These values are all optional
      ...(body.content !== undefined && { content: body.content }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.url !== undefined && { url: body.url }),
      ...(body.isFavorite !== undefined && { isFavorite: body.isFavorite }),
    },
  });

  if (updated.count === 0) return c.notFound();

  // ✅ Pinecone update (no URL)
  const index = pc.index("memories");
  const namespace = index.namespace(user.id);
  const pineconeRecord = {
    id,
    text: body.content ?? "", // fallback to empty string
    ...(body.title !== undefined && { title: body.title }),
  };

  await namespace.upsertRecords([pineconeRecord]);

  return c.json({ success: true });
});


export default memoryRoutes;
