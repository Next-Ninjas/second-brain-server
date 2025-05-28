// import { zValidator } from "@hono/zod-validator";

// import { prismaClient } from "../../integration/prisma/prisma.js";

// import { createSecureRoute } from "../middlewares/session-middleware.js";
// import { memorySchema } from "../../validators/memory.js";
// import { getUserNamespace } from "../../lib/pinecone.js";

// const memoryRoutes = createSecureRoute();

// // ✅ CREATE MEMORY + Pinecone upsert
// memoryRoutes.post("/", zValidator("json", memorySchema), async (c) => {
//   const user = c.get("user");
//   const body = await c.req.json();

//   const memory = await prismaClient.memory.create({
//     data: {
//       userId: user.id,
//       content: body.content,
//       title: body.title,
//       tags: body.tags || [],
//       metadata: body.metadata,
//       isFavorite: body.isFavorite ?? false,
//     },
//   });

//   const ns = getUserNamespace(user.id);
//   await ns.upsertRecords([
//     {
//       id: memory.id,
//       text: memory.content,
//       metadata: [user.id], // Assuming metadata should be a string array
//     },
//   ]);

//   return c.json(memory);
// });

// // ✅ GET ALL memories for the user
// memoryRoutes.get("/", async (c) => {
//   const user = c.get("user");

//   const memories = await prismaClient.memory.findMany({
//     where: { userId: user.id },
//     orderBy: { createdAt: "desc" },
//   });

//   return c.json(memories);
// });

// // ✅ GET single memory
// memoryRoutes.get("/:id", async (c) => {
//   const user = c.get("user");
//   const id = c.req.param("id");

//   const memory = await prismaClient.memory.findFirst({
//     where: {
//       id,
//       userId: user.id,
//     },
//   });

//   if (!memory) return c.notFound();
//   return c.json(memory);
// });

// // ✅ UPDATE memory + Pinecone update
// memoryRoutes.put("/:id", zValidator("json", memorySchema), async (c) => {
//   const user = c.get("user");
//   const id = c.req.param("id");
//   const body = await c.req.json();

//   const updated = await prismaClient.memory.updateMany({
//     where: { id, userId: user.id },
//     data: {
//       content: body.content,
//       title: body.title,
//       tags: body.tags || [],
//       metadata: body.metadata,
//       isFavorite: body.isFavorite ?? false,
//     },
//   });

//   if (updated.count === 0) return c.notFound();

//   const ns = getUserNamespace(user.id);
//   await ns.upsertRecords([
//     {
//       id,
//       text: body.content,
//       metadata: [body.title || "", body.tags.join(","), user.id], // Ensure metadata is a string array
//     },
//   ]);

//   return c.json({ success: true });
// });

// // ✅ DELETE memory + Pinecone delete
// memoryRoutes.delete("/:id", async (c) => {
//   const user = c.get("user");
//   const id = c.req.param("id");

//   const deleted = await prismaClient.memory.deleteMany({
//     where: { id, userId: user.id },
//   });

//   if (deleted.count === 0) return c.notFound();

//   const ns = getUserNamespace(user.id);
//   await ns.deleteOne(id);

//   return c.json({ success: true });
// });

// export default memoryRoutes;

import { zValidator } from "@hono/zod-validator";

import { prismaClient } from "../../integration/prisma/prisma.js";
import { createSecureRoute } from "../middlewares/session-middleware.js";
import { memorySchema } from "../../validators/memory.js";

const memoryRoutes = createSecureRoute();

// ✅ CREATE MEMORY
memoryRoutes.post("/", zValidator("json", memorySchema), async (c) => {
  const user = c.get("user");
  const body = await c.req.json();

  const memory = await prismaClient.memory.create({
    data: {
      userId: user.id,
      content: body.content,
      title: body.title,
      tags: body.tags || [],
      url: body.url,
      metadata: body.metadata,
      isFavorite: body.isFavorite ?? false,
    },
  });

  return c.json(memory);
});

// ✅ GET ALL memories for the user
memoryRoutes.get("/", async (c) => {
  const user = c.get("user");

  const memories = await prismaClient.memory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
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

// ✅ UPDATE memory
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
      metadata: body.metadata,
      isFavorite: body.isFavorite ?? false,
    },
  });

  if (updated.count === 0) return c.notFound();

  return c.json({ success: true });
});

// ✅ DELETE memory
memoryRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const deleted = await prismaClient.memory.deleteMany({
    where: { id, userId: user.id },
  });

  if (deleted.count === 0) return c.notFound();

  return c.json({ success: true });
});

export default memoryRoutes;
