import { prismaClient } from "../../integration/prisma/prisma";
import { mistral, pc } from "../../lib/pinecone";
import { createSecureRoute } from "../middlewares/session-middleware";

export const chatRoutes = createSecureRoute();

// Create new chat session
chatRoutes.post("/session", async (c) => {
  const user = c.get("user");
  const { title } = await c.req.json();

  const session = await prismaClient.chatSession.create({
    data: {
      userId: user.id,
      title: title || "New Chat",
    },
  });

  return c.json({ success: true, session });
});



// chatRoutes.post("/:sessionId", async (c) => {
//   const user = c.get("user");
//   const { sessionId } = c.req.param();
//   const { message } = await c.req.json();

//   const session = await prismaClient.chatSession.findFirst({
//     where: { id: sessionId, userId: user.id },
//     include: { messages: true },
//   });

//   if (!session) {
//     return c.json({ success: false, message: "Session not found" }, 404);
//   }

//   // Step 1: Save user's message
//   await prismaClient.chatMessage.create({
//     data: {
//       sessionId,
//       role: "user",
//       content: message,
//     },
//   });

//   // Step 2: Retrieve ALL user memories
//   const memoryRecords = await prismaClient.memory.findMany({
//     where: { userId: user.id },
//     orderBy: { createdAt: "desc" },
//   });

//   // Optional: Limit number of memories for token safety
//   const MAX_MEMORIES = 30;
//   const contextText = memoryRecords
//     .slice(0, MAX_MEMORIES)
//     .map((m) => `- ${m.title || "Untitled"}: ${m.content}`)
//     .join("\n");

//   // Step 3: Construct prompt messages
//   const systemPrompt: { role: "system"; content: string } = {
//     role: "system",
//     content: `You are a helpful assistant. Use the provided context and recent chat history to answer follow-up questions.
// Resolve pronouns and references based on earlier conversation.
// Use the memory context carefully to support your answer.`,
//   };

//   const contextPrompt: { role: "user"; content: string } = {
//     role: "user",
//     content: `
// ## USER MESSAGE
// ${message}

// ## CONTEXTUAL USER MEMORIES
// ${contextText}
// `.trim(),
//   };

//   const history = session.messages.slice(-10).map((m) => {
//     const role = m.role;
//     if (
//       role === "user" ||
//       role === "assistant" ||
//       role === "system" ||
//       role === "tool"
//     ) {
//       return {
//         role,
//         content: m.content,
//       } as
//         | { role: "user"; content: string }
//         | { role: "assistant"; content: string }
//         | { role: "system"; content: string }
//         | { role: "tool"; content: string };
//     }
//     throw new Error(`Invalid message role: ${role}`);
//   });

//   const promptMessages: (
//     | { role: "user"; content: string }
//     | { role: "assistant"; content: string }
//     | { role: "system"; content: string }
//     | { role: "tool"; content: string }
//   )[] = [systemPrompt, ...history, contextPrompt];

//   // Step 4: Get AI response from Mistral
//   const aiResponse = await mistral.chat.complete({
//     model: "mistral-large-latest",
//     messages: promptMessages,
//   });

//   const rawReply = aiResponse.choices?.[0]?.message?.content;
//   const reply =
//     typeof rawReply === "string"
//       ? rawReply
//       : Array.isArray(rawReply)
//         ? rawReply
//             .filter((chunk) => "text" in chunk && typeof chunk.text === "string")
//             .map((chunk) => (chunk as { text: string }).text)
//             .join("")
//         : "I don't know how to respond.";

//   // Step 5: Save assistant's reply
//   await prismaClient.chatMessage.create({
//     data: {
//       sessionId,
//       role: "assistant",
//       content: reply,
//     },
//   });

//   return c.json({ success: true, reply });
// });

chatRoutes.post("/:sessionId", async (c) => {
  const user = c.get("user");
  const { sessionId } = c.req.param();
  const { message } = await c.req.json();

  const session = await prismaClient.chatSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: { messages: true },
  });

  if (!session) {
    return c.json({ success: false, message: "Session not found" }, 404);
  }

  // Step 1: Save user's message
  await prismaClient.chatMessage.create({
    data: {
      sessionId,
      role: "user",
      content: message,
    },
  });

  // Step 2: Retrieve relevant memories from Pinecone
  const namespace = pc.index("memories").namespace(user.id);
  const pineconeResponse = await namespace.searchRecords({
    query: {
      inputs: { text: message },
      topK: 20,
    },
    rerank: {
      model: "bge-reranker-v2-m3",
      topN: 5,
      rankFields: ["text"],
    },
  });

  const relevantHits = pineconeResponse.result.hits.filter(
    (hit) => hit._score && hit._score >= 0.2
  );

  const ids = relevantHits.map((hit) => hit._id);

  const memoryRecords = await prismaClient.memory.findMany({
    where: {
      id: { in: ids },
      userId: user.id,
    },
  });

  const memoryMap = new Map(memoryRecords.map((m) => [m.id, m]));

  const relevantMemories = relevantHits
    .map((hit) => memoryMap.get(hit._id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const contextText = relevantMemories
    .map((m) => `- ${m.title || "Untitled"}: ${m.content}`)
    .join("\n");

  // Step 3: Construct prompt messages
  const systemPrompt: { role: "system"; content: string } = {
    role: "system",
    content: `You are a helpful assistant. Use the provided context and recent chat history to answer follow-up questions.
Resolve pronouns and references based on earlier conversation.
Use the memory context carefully to support your answer.`,
  };

  const contextPrompt: { role: "user"; content: string } = {
    role: "user",
    content: `
## USER MESSAGE
${message}

## CONTEXTUAL USER MEMORIES
${contextText}
`.trim(),
  };

  const history = session.messages.slice(-10).map((m) => {
    const role = m.role;
    if (
      role === "user" ||
      role === "assistant" ||
      role === "system" ||
      role === "tool"
    ) {
      return {
        role,
        content: m.content,
      } as
        | { role: "user"; content: string }
        | { role: "assistant"; content: string }
        | { role: "system"; content: string }
        | { role: "tool"; content: string };
    }
    throw new Error(`Invalid message role: ${role}`);
  });

  const promptMessages: (
    | { role: "user"; content: string }
    | { role: "assistant"; content: string }
    | { role: "system"; content: string }
    | { role: "tool"; content: string }
  )[] = [systemPrompt, ...history, contextPrompt];

  // Step 4: Get AI response from Mistral
  const aiResponse = await mistral.chat.complete({
    model: "mistral-large-latest",
    messages: promptMessages,
  });

  const rawReply = aiResponse.choices?.[0]?.message?.content;
  const reply =
    typeof rawReply === "string"
      ? rawReply
      : Array.isArray(rawReply)
        ? rawReply
            .filter((chunk) => "text" in chunk && typeof chunk.text === "string")
            .map((chunk) => (chunk as { text: string }).text)
            .join("")
        : "I don't know how to respond.";

  // Step 5: Save assistant's reply
  await prismaClient.chatMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: reply,
    },
  });

  // Step 6: Return response along with relevant memories
  return c.json({
    success: true,
    reply,
    relevantMemories, // <-- Included in response
  });
});


chatRoutes.get("/:sessionId/messages", async (c) => {
  const user = c.get("user");
  const { sessionId } = c.req.param();

  const messages = await prismaClient.chatMessage.findMany({
    where: {
      sessionId,
      session: { userId: user.id },
    },
    orderBy: { createdAt: "asc" },
  });

  return c.json({ success: true, messages });
});

// Edit a message
chatRoutes.patch("/message/:messageId", async (c) => {
  const user = c.get("user");
  const { messageId } = c.req.param();
  const { content } = await c.req.json();

  const message = await prismaClient.chatMessage.findFirst({
    where: {
      id: messageId,
      session: { userId: user.id },
    },
  });

  if (!message) {
    return c.json({ success: false, message: "Message not found or unauthorized" }, 404);
  }

  const updated = await prismaClient.chatMessage.update({
    where: { id: messageId },
    data: { content },
  });

  return c.json({ success: true, message: updated });
});

// Delete session and messages
chatRoutes.delete("/:sessionId", async (c) => {
  const user = c.get("user");
  const { sessionId } = c.req.param();

  const session = await prismaClient.chatSession.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) {
    return c.json({ success: false, message: "Session not found or unauthorized" }, 404);
  }

  await prismaClient.chatMessage.deleteMany({ where: { sessionId } });
  await prismaClient.chatSession.delete({ where: { id: sessionId } });

  return c.json({ success: true, message: "Session and its messages deleted" });
});

chatRoutes.get("/all/sessions", async (c) => {
  const user = c.get("user");

  const sessions = await prismaClient.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    }, // optional: get latest message
  });

  return c.json({ success: true, sessions });
});
