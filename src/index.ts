import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/ping", (c) => {
  return c.json({ message: "heiarfoafaslkdf" });
});

serve(app, (port) => {
  console.log(`Server is running on port http://localhost:${port}`);
});
