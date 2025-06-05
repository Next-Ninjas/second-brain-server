import { prismaClient as prisma } from "../../integration/prisma/prisma.js";
import { createSecureRoute } from "../middlewares/session-middleware.js";

export const userRoute = createSecureRoute();

userRoute.get("/me", async (context) => {
  const user = context.get("user");
  const userId = user?.id;

  if (!userId) {
    return context.json({ error: "User not found" }, 404);
  }

  try {
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { memories: true }, // 👈 Add count
        },
      },
    });

    if (!userData) {
      return context.json({ error: "User not found" }, 404);
    }

    return context.json({
      user: {
        ...userData,
        name: userData.name || "",
        image: userData.image || "",
        memoriesCount: userData._count.memories, // 👈 Add count from _count
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return context.json({ error: "Internal server error" }, 500);
  }
});
