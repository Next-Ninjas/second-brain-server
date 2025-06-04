// src/validators/memory.ts
import { z } from "zod";

// export const memorySchema = z.object({
//   content: z.string().min(1),
//   title: z.string().optional(),
//   tags: z.array(z.string()).optional(),
// });



export const memorySchema = z.object({
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  isFavorite: z.boolean().optional(),
});


export const partialMemorySchema = memorySchema.partial();