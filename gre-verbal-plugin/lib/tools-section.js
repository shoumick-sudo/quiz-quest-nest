import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { section, response, normalizeSection } from "./schemas.js";
import { openSession, getSession, saveResponse, snapshot, finalize } from "./session-store.js";

export function registerSectionTools(server, templateUri) {
  registerAppTool(server, "render_gre_section", {
    title: "Render GRE section",
    description:
      "Render a timed GRE Verbal section with navigation, Mark for Review, answer changing, and final submission. Never include answer keys or explanations.",
    inputSchema: { section },
    outputSchema: {
      section,
      savedResponses: z.array(response),
      answeredQuestionIds: z.array(z.string()),
      markedQuestionIds: z.array(z.string())
    },
    _meta: {
      ui: { resourceUri: templateUri },
      "openai/outputTemplate": templateUri
    }
  }, async ({ section: raw }) => {
    const normalized = normalizeSection(raw);
    const session = await openSession(normalized);
    return {
      structuredContent: snapshot(session),
      content: [{ type: "text", text: "Rendered GRE section " + normalized.sessionId + "." }]
    };
  });

  registerAppTool(server, "save_gre_response", {
    title: "Save GRE response",
    description: "Save one response or review flag for an active GRE section.",
    inputSchema: { sessionId: z.string(), response },
    outputSchema: { saved: z.boolean(), questionId: z.string() },
    _meta: { ui: { visibility: ["app"] } }
  }, async ({ sessionId, response: r }) => {
    const session = await getSession(sessionId);
    if (!session) throw new Error("Session unavailable");
    if (session.submitted) throw new Error("Section already submitted");
    if (!session.section.questions.some((q) => q.questionId === r.questionId)) {
      throw new Error("Question not found");
    }
    await saveResponse(session, r);
    return {
      structuredContent: { saved: true, questionId: r.questionId },
      content: [{ type: "text", text: "Saved " + r.questionId + "." }]
    };
  });

  registerAppTool(server, "submit_gre_section", {
    title: "Finish GRE section",
    description:
      "Finalize a GRE section and return responses, unanswered questions, review flags, and timing. Can reconstruct a lost server session from the widget's fallback section state. Does not grade.",
    inputSchema: {
      sessionId: z.string(),
      elapsedSeconds: z.number().nonnegative(),
      timedOut: z.boolean().optional(),
      fallbackSection: section.optional(),
      fallbackResponses: z.array(response).optional(),
      fallbackMarkedQuestionIds: z.array(z.string()).optional()
    },
    outputSchema: {
      result: z.object({
        sessionId: z.string(),
        accepted: z.boolean(),
        totalQuestions: z.number().int(),
        answeredCount: z.number().int(),
        unansweredQuestionIds: z.array(z.string()),
        markedQuestionIds: z.array(z.string()),
        elapsedSeconds: z.number(),
        timedOut: z.boolean(),
        responses: z.array(response)
      })
    },
    _meta: { ui: { visibility: ["app"] } }
  }, async (args) => {
    let session = await getSession(args.sessionId);

    if (!session && args.fallbackSection) {
      const recovered = normalizeSection({
        ...args.fallbackSection,
        sessionId: args.sessionId
      });
      session = await openSession(recovered);
    }

    if (!session) {
      throw new Error("Session unavailable and no fallback section was supplied");
    }

    if (session.submitted && session.result) {
      return {
        structuredContent: { result: session.result },
        content: [{ type: "text", text: "GRE section was already submitted." }]
      };
    }

    for (const r of args.fallbackResponses || []) {
      await saveResponse(session, r);
    }
    for (const id of args.fallbackMarkedQuestionIds || []) {
      const existing = session.responses[id] || { questionId: id };
      await saveResponse(session, { ...existing, markedForReview: true });
    }

    const result = await finalize(session, args.elapsedSeconds, args.timedOut);
    return {
      structuredContent: { result },
      content: [{
        type: "text",
        text: "GRE section submitted" + (args.fallbackSection ? " with recovery support." : ".")
      }]
    };
  });
}
