// src/lib/pinecone.ts
import { Pinecone } from "@pinecone-database/pinecone";
import { pineconeApiKey } from "../utils/environment/index.js";


export const pc = new Pinecone({ apiKey: pineconeApiKey });

export function getUserNamespace(userId: string) {
  return pc.index("memories").namespace(userId); // 👈 User-specific
}
