import { prismaClient as prisma } from "../../integration/prisma/prisma.js";
import { createSecureRoute } from "../middlewares/session-middleware.js";
import { IncomingForm } from "formidable";
import * as fs from "fs";
import * as path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import { HTTPException } from "hono/http-exception";

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

    return context.json({
      user: {
        ...userData,
        name: userData.name || "",
        image: userData.image || "",
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return context.json({ error: "Internal server error" }, 500);
  }
});

userRoute.post("/me", async (c) => {
  const user = c.get("user");

  if (!user?.id) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const form = new IncomingForm({ multiples: false, keepExtensions: true });

  const { files } = await new Promise<{ fields: any; files: any }>(
    (resolve, reject) => {
      form.parse((c.req as any).raw ?? (c.req as any), (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    }
  );

  const photo = files.photo;

  if (!photo || Array.isArray(photo) || !photo.filepath) {
    throw new HTTPException(400, { message: "Photo file is required" });
  }

  // Dynamic import to fix Azure (ESM-only nanoid)
  const { nanoid } = await import("nanoid");

  // Ensure upload directory
  const uploadsDir = path.resolve("uploads");
  if (!fs.existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  // Save image
  const ext = path.extname(photo.originalFilename || ".jpg");
  const filename = `${nanoid()}${ext}`;
  const filePath = path.join(uploadsDir, filename);
  const fileBuffer = await readFile(photo.filepath);
  await writeFile(filePath, fileBuffer);

  const imageUrl = `/uploads/${filename}`; // Consider CDN/public path in production

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { image: imageUrl },
  });

  return c.json({
    message: "Profile photo uploaded successfully",
    image: imageUrl,
    user: updatedUser,
  });
});
