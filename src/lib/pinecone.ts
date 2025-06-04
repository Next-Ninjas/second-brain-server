import { Mistral } from "@mistralai/mistralai";
import { Pinecone } from "@pinecone-database/pinecone";
import { mistralApiKey, pineconeApiKey } from "../utils/environment";


export const mistral = new Mistral({ apiKey: mistralApiKey });
export const pc = new Pinecone({ apiKey: pineconeApiKey });