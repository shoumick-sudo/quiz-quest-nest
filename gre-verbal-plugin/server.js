import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createGreMcp } from "./lib/mcp.js";
import { databaseHealth } from "./lib/database.js";
import { sessionPersistenceMode } from "./lib/session-store.js";

const port = Number(process.env.PORT || 8787);

const httpServer = createServer(async (req, res) => {
  if (!req.url) return res.writeHead(400).end("Missing URL");
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));

  if (req.method === "OPTIONS" && url.pathname === "/mcp") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id"
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/") {
    const db = await databaseHealth();
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      service: "GRE Verbal Quiz",
      version: "0.5.1",
      capabilities: [
        "clickable-questions",
        "learner-reasoning-notes",
        "immediate-practice-answer-reveal",
        "timed-sections",
        "mastery-dashboard",
        "spaced-retrieval",
        "vocabulary-review",
        "mistake-review-queue",
        "drive-question-note-payloads"
      ],
      mcp: "/mcp",
      sessionPersistence: sessionPersistenceMode(),
      database: db
    }));
  }

  if (url.pathname === "/mcp" && ["POST", "GET", "DELETE"].includes(req.method || "")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    const mcp = createGreMcp();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on("close", () => {
      transport.close();
      mcp.close();
    });
    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) res.writeHead(500).end("Internal server error");
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(
    "GRE Verbal MCP v0.5.1 listening on port " +
    port +
    " with " +
    sessionPersistenceMode() +
    " session persistence"
  );
});
