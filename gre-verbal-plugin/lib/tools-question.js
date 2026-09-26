import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { question, response, normalizeQuestion } from "./schemas.js";

export function registerQuestionTools(server, templateUri) {
  registerAppTool(server, "render_gre_question", {
    title: "Render GRE question",
    description: "Render one clickable GRE Verbal item. Supports single-select, multi-select, multi-blank TC, and select-in-passage. Never include answer keys or explanations.",
    inputSchema: { question },
    outputSchema: { question },
    _meta: { ui: { resourceUri: templateUri }, "openai/outputTemplate": templateUri }
  }, async ({ question: q }) => {
    const normalized = normalizeQuestion(q);
    return {
      structuredContent: { question: normalized },
      content: [{ type: "text", text: "Rendered GRE question " + normalized.questionId + "." }]
    };
  });

  registerAppTool(server, "submit_gre_answer", {
    title: "Submit GRE answer",
    description: "Submit one standalone GRE response from the widget. Does not grade.",
    inputSchema: {
      questionId: z.string(),
      selected: z.array(z.string()).optional(),
      blankSelections: response.shape.blankSelections,
      sentenceId: z.string().optional(),
      elapsedSeconds: z.number().nonnegative().optional()
    },
    outputSchema: {
      submission: response.extend({ accepted: z.boolean(), elapsedSeconds: z.number().nonnegative().optional() })
    },
    _meta: { ui: { visibility: ["app"] } }
  }, async (args) => ({
    structuredContent: { submission: { ...args, accepted: true } },
    content: [{ type: "text", text: "Answer submitted for " + args.questionId + "." }]
  }));
}
