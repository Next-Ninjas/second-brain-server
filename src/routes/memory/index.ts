import { prismaClient } from "../../integration/prisma/prisma";
import { createSecureRoute } from "../middlewares/session-middleware";

export const memoryRoute = createSecureRoute();

memoryRoute.get("/:id", async (c) => {
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