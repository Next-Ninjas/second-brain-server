// src/validators/memory.ts
import { z } from "zod";

export const memorySchema = z.object({
  content: z.string().min(1),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
