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

// Send message to session
chatRoutes.post("/:sessionId", async (c) => {
  const user = c.get("user");
  const { sessionId } = c.req.param();
  const { message } = await c.req.json();

  const session = await prismaClient.chatSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: { messages: true },
  });

  if (!session) return c.json({ success: false, message: "Session not found" }, 404);

  // Store user's message
  await prismaClient.chatMessage.create({
    data: {
      sessionId,
      role: "user",
      content: message,
    },
  });

  // Search Pinecone memory
  const namespace = pc.index("memories").namespace(user.id);
  const pineconeResponse = await namespace.searchRecords({
    query: { inputs: { text: message }, topK: 20 },
    rerank: { model: "bge-reranker-v2-m3", topN: 5, rankFields: ["text"] },
  });

  const relevantHits = pineconeResponse.result.hits.filter((hit) => hit._score && hit._score >= 0.2);
  const ids = relevantHits.map((hit) => hit._id);

  const memoryRecords = await prismaClient.memory.findMany({
    where: { id: { in: ids }, userId: user.id },
  });

  const contextText = memoryRecords
    .map((m) => `- ${m.title || "Untitled"}: ${m.content}`)
    .join("\n");

  // Fix: cast roles to exact literal types for Mistral's expected types
  const history = session.messages
    .slice(-5)
    .map((m) => ({
      role: m.role as "user" | "assistant" | "system" | "tool",
      content: m.content,
    }));

  const promptMessages = [
    ...history,
    {
      role: "system" as const,
      content: `Contextual user memories:\n${contextText}`,
    },
    {
      role: "user" as const,
      content: message,
    },
  ];

  // Call Mistral chat completion
  const aiResponse = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: promptMessages,
  });

  // Ensure reply content is a string before saving
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

  // Store assistant's reply
  await prismaClient.chatMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: reply,
    },
  });

  return c.json({ success: true, reply });
});

// Get messages for session
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

// ✅ Edit a message
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

// ✅ Delete a session and its messages
chatRoutes.delete("/:sessionId", async (c) => {
  const user = c.get("user");
  const { sessionId } = c.req.param();

  const session = await prismaClient.chatSession.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) {
    return c.json({ success: false, message: "Session not found or unauthorized" }, 404);
  }

  // Delete all messages first due to foreign key constraints
  await prismaClient.chatMessage.deleteMany({
    where: { sessionId },
  });

  // Then delete session
  await prismaClient.chatSession.delete({
    where: { id: sessionId },
  });

  return c.json({ success: true, message: "Session and its messages deleted" });
});


chatRoutes.get("/all/sessions", async (c) => {
  const user = c.get("user");
  const sessions = await prismaClient.chatMessage.findMany({
   where: { session: { userId: user.id } },
    orderBy: { createdAt: "desc" },
  });
    return c.json({ success: true, sessions });

})

