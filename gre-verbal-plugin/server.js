import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const TEMPLATE_URI = "ui://gre-verbal/question-v1.html";
const widgetHtml = readFileSync(new URL("./public/gre-question-widget.html", import.meta.url), "utf8");

const choiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const progressSchema = z.object({
  current: z.number().int().min(1),
  total: z.number().int().min(1),
}).optional();

const questionSchema = z.object({
  questionId: z.string().min(1),
  mode: z.enum(["practice", "test"]).default("practice"),
  sourceLabel: z.enum(["OFFICIAL-ETS", "ETS-DERIVED", "GENERATED-PRACTICE"]),
  questionType: z.enum(["TC", "SE", "RC", "VOCAB", "MIXED"]),
  difficulty: z.enum(["FOUNDATION", "EASY", "MEDIUM", "HARD", "GRE-LEVEL MIXED"]),
  title: z.string().optional(),
  instructions: z.string().optional(),
  passage: z.string().optional(),
  stem: z.string().min(1),
  choiceMode: z.enum(["single", "multi"]),
  minSelections: z.number().int().min(1).optional(),
  maxSelections: z.number().int().min(1).optional(),
  choices: z.array(choiceSchema).min(2).max(12),
  progress: progressSchema,
});

const renderQuestionInputSchema = {
  question: questionSchema,
};

const renderQuestionOutputSchema = {
  question: questionSchema,
};

const submitAnswerInputSchema = {
  questionId: z.string().min(1),
  selected: z.array(z.string().min(1)).min(1),
  elapsedSeconds: z.number().nonnegative().optional(),
};

const submitAnswerOutputSchema = {
  submission: z.object({
    questionId: z.string(),
    selected: z.array(z.string()),
    elapsedSeconds: z.number().nonnegative().optional(),
    accepted: z.boolean(),
  }),
};

function normalizeQuestion(question) {
  const defaultMax = question.choiceMode === "single" ? 1 : 2;
  const minSelections = question.minSelections ?? (question.choiceMode === "single" ? 1 : 2);
  const maxSelections = question.maxSelections ?? defaultMax;

  if (minSelections > maxSelections) {
    throw new Error("minSelections cannot exceed maxSelections");
  }
  if (maxSelections > question.choices.length) {
    throw new Error("maxSelections cannot exceed number of choices");
  }

  return {
    ...question,
    minSelections,
    maxSelections,
  };
}

function createGreServer() {
  const server = new McpServer({
    name: "gre-verbal-clickable-quiz",
    version: "0.1.0",
  });

  registerAppResource(
    server,
    "gre-question-widget",
    TEMPLATE_URI,
    {},
    async () => ({
      contents: [
        {
          uri: TEMPLATE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: {
              prefersBorder: true,
            },
          },
        },
      ],
    })
  );

  registerAppTool(
    server,
    "render_gre_question",
    {
      title: "Render GRE question",
      description:
        "Render exactly one GRE-style multiple-choice question as a clickable ChatGPT widget. Use this whenever presenting a GRE Verbal MCQ, diagnostic item, drill item, or test item. Do not include the correct answer in the tool input.",
      inputSchema: renderQuestionInputSchema,
      outputSchema: renderQuestionOutputSchema,
      _meta: {
        ui: { resourceUri: TEMPLATE_URI },
        "openai/outputTemplate": TEMPLATE_URI,
        "openai/toolInvocation/invoking": "Preparing GRE question…",
        "openai/toolInvocation/invoked": "GRE question ready.",
      },
    },
    async ({ question }) => {
      const normalized = normalizeQuestion(question);
      return {
        structuredContent: { question: normalized },
        content: [
          {
            type: "text",
            text: `Rendered GRE question ${normalized.questionId}. Wait for the learner to submit through the widget.`,
          },
        ],
      };
    }
  );

  registerAppTool(
    server,
    "submit_gre_answer",
    {
      title: "Submit GRE answer",
      description:
        "Record the learner's selected choice IDs from the clickable GRE widget. The widget calls this tool; it does not grade the answer.",
      inputSchema: submitAnswerInputSchema,
      outputSchema: submitAnswerOutputSchema,
      _meta: {
        ui: { visibility: ["app"] },
      },
    },
    async ({ questionId, selected, elapsedSeconds }) => ({
      structuredContent: {
        submission: {
          questionId,
          selected,
          ...(elapsedSeconds !== undefined ? { elapsedSeconds } : {}),
          accepted: true,
        },
      },
      content: [
        {
          type: "text",
          text: `Answer submitted for ${questionId}: ${selected.join(", ")}`,
        },
      ],
    })
  );

  return server;
}

const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res
      .writeHead(200, { "content-type": "text/plain; charset=utf-8" })
      .end("GRE Verbal clickable quiz MCP server");
    return;
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createGreServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Internal server error");
      }
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`GRE Verbal MCP server listening on http://localhost:${port}${MCP_PATH}`);
});
