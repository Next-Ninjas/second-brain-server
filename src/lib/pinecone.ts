// src/lib/pinecone.ts
import { Pinecone } from "@pinecone-database/pinecone";
import { pinecodeApiKey } from "../utils/environment/index.js";


export const pc = new Pinecone({ apiKey: pinecodeApiKey });

export function getUserNamespace(userId: string) {
  return pc.index("memories").namespace(userId); // 👈 User-specific
}
