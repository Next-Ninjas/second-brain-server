import { betterAuth } from "better-auth";
import { serverUrl, webClientUrl } from "../../utils/environment/index.js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prismaClient } from "../prisma/prisma.js";

export const betterAuthClient = betterAuth({
  baseURL: serverUrl,
  basePath: "/auth",
  database: prismaAdapter(prismaClient, {
    provider: "postgresql",
  }),
  trustedOrigins: [webClientUrl],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    modelName: "User",
  },
  account: {
    modelName: "Account",
  },
  session: {
    modelName: "Session",
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  verification: {
    modelName: "Verification",
  },

   
  //  advanced: {
  //   defaultCookieAttributes: {
  //     sameSite: "none",
  //     secure: true,
  //     partitioned: true,
  //   },
  // },

advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: "neuronote.site",
    },
  },


});
