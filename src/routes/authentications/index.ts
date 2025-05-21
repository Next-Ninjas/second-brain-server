import { betterAuthClient } from "../../integrations/better-auth/index.js";
import { createUnsecureRoute } from "../middlewares/session-middleware.js";

export const authenticationsRoute = createUnsecureRoute();

authenticationsRoute.use((context) => {
  return betterAuthClient.handler(context.req.raw);
});
