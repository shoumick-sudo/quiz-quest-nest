import test from "node:test";
import assert from "node:assert/strict";
import { createGreMcp } from "../lib/mcp.js";

test("GRE MCP v0.4 registers all tools and resources without throwing", () => {
  const server = createGreMcp();
  assert.ok(server);
  assert.equal(typeof server.connect, "function");
});
