import { createSecureRoute } from "../middlewares/session-middleware.js";
import { mistralApiKey, pineconeApiKey } from "../../utils/environment";
import { Mistral } from "@mistralai/mistralai";
import { Pinecone } from "@pinecone-database/pinecone";

const chatRoutes = createSecureRoute();
const mistral = new Mistral({ apiKey: mistralApiKey });
const pc = new Pinecone({ apiKey: pineconeApiKey });

chatRoutes.get("/ai/chat", async (c) => {
  const user = c.get("user");
  const { q: query, limit = "2", offset = "0" } = c.req.query();

  if (!query || query.trim() === "") {
    return c.json({ success: false, message: "Query 'q' is required." }, 400);
  }

  // Step 1: Search Pinecone for relevant memories
  const namespace = pc.index("memories").namespace(user.id);
  const pineconeResponse = await namespace.searchRecords({
    query: {
      inputs: { text: query },
      topK: parseInt(limit),
    },
    rerank: {
      model: "bge-reranker-v2-m3",
      topN: parseInt(limit),
      rankFields: ["text"],
    },
  });

  const memories = pineconeResponse.result.hits.map((hit) => {
    const fields = hit.fields as {
      text: string;
      title?: string;
    };
    return {
      id: hit._id,
      title: fields?.title || "Untitled",
      text: fields.text,
    };
  });

  // Step 2: Construct context string for Mistral
  const contextText = memories.map((m) => `- ${m.title}: ${m.text}`).join("\n");
  const prompt = `
## QUERY
${query}
---
## CONTEXT
${contextText}
`.trim();

  // Step 3: Ask Mistral for summary/answer
  const response = await mistral.chat.complete({
    model: "mistral-small-latest", // You can change to large if needed
    messages: [{ role: "user", content: prompt }],
  });

  const summary = response.choices?.[0]?.message?.content || "No summary generated.";

  return c.json({
    success: true,
    query,
    summary,
    results: memories,
    meta: {
      count: memories.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
});

export default chatRoutes;


