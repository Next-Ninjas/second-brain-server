

import { createSecureRoute } from "../middlewares/session-middleware";
import { mistralApiKey } from "../../utils/environment";
import { Mistral } from "@mistralai/mistralai";

const chatRoutes = createSecureRoute();

const mistral = new Mistral({ apiKey: mistralApiKey });

chatRoutes.get("/ai/chat", async (c) => {
  const { q: query } = c.req.query();

  if (!query || query.trim() === "") {
    return c.json({ success: false, message: "Query 'q' is required." }, 400);
  }

  const response = await mistral.chat.complete({
    model: "mistral-large-latest", 
    messages: [
      {
        role: "user",
        content: query,
      },
    ],
  });

  const message = response.choices?.[0]?.message?.content || "No response";

  return c.json({
    success: true,
    query,
    reply: message,
  });
});

export default chatRoutes;
