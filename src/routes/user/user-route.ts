import { prismaClient as prisma } from "../../integration/prisma/prisma.js";
import { createSecureRoute } from "../middlewares/session-middleware.js";

export const userRoute = createSecureRoute();
enum GetMeError {
  USER_NOT_FOUND = "USER_NOT_FOUND",
  UNKNOWN = "UNKNOWN",
}

userRoute.get("/me", async (context) => {
  const user = context.get("user");
  const userId = user?.id;

  if (!userId) {
    return context.json({ error: "User not found" }, 404);
  }

  if (context.req.method === "GET") {
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
          sessions: {
            select: {
              id: true,
              token: true,
              expiresAt: true,
              ipAddress: true,
              userAgent: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          accounts: {
            select: {
              id: true,
              accountId: true,
              providerId: true,
              accessToken: true,
              refreshToken: true,
              accessTokenExpiresAt: true,
              refreshTokenExpiresAt: true,
              scope: true,
              idToken: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          memories: {
            select: {
              id: true,
              title: true,
              content: true,
              url: true,
              tags: true,
              metadata: true,
              isFavorite: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!userData) {
        return context.json({ error: "User not found" }, 404);
      }

      return context.json(
        {
          user: {
            ...userData,
            name: userData.name || "",
            image: userData.image || "",
          },
        },
        200
      );
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return context.json({ error: "Internal server error" }, 500);
    }
  } else {
    return context.json({ error: "Method not allowed" }, 405);
  }
});

