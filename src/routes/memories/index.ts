import { zValidator } from "@hono/zod-validator";

import { prismaClient } from "../../integration/prisma/prisma.js";
import { createSecureRoute } from "../middlewares/session-middleware.js";
import { memorySchema } from "../../validators/memory.js";
import { Pinecone } from "@pinecone-database/pinecone";
import { pineconeApiKey } from "../../utils/environment/index.js";



export const pc = new Pinecone({ apiKey: pineconeApiKey });

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
memoryRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const memory = await prismaClient.memory.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!memory) return c.notFound();
  return c.json(memory);
});

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


export default memoryRoutes;
