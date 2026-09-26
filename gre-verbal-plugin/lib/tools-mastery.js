import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { evaluation, makeMasteryPacket } from "./mastery.js";
import { getStoredResult, saveEvaluation } from "./session-store.js";

const masteryPacketSchema = z.object({
  packetVersion: z.string(),
  sessionId: z.string(),
  evaluatedAt: z.string(),
  accuracy: z.number().min(0).max(1).optional(),
  correctCount: z.number().int().min(0).optional(),
  totalQuestions: z.number().int().min(0).optional(),
  skillBreakdown: evaluation.shape.skillBreakdown,
  errorCategories: evaluation.shape.errorCategories,
  vocabularyWeaknesses: evaluation.shape.vocabularyWeaknesses,
  masteryEvidence: evaluation.shape.masteryEvidence,
  officialItemsExposed: evaluation.shape.officialItemsExposed,
  nextPriorities: evaluation.shape.nextPriorities,
  pacingSummary: z.string().optional(),
  notes: z.string().optional(),
  persistenceInstruction: z.string()
});

export function registerMasteryTools(server) {
  registerAppTool(server, "record_gre_evaluation", {
    title: "Record GRE evaluation",
    description:
      "After grading a completed GRE section, store a structured evaluation and return a mastery packet. Use concrete evidence only; do not infer mastery beyond the completed work.",
    inputSchema: {
      sessionId: z.string().min(1),
      evaluation
    },
    outputSchema: {
      masteryPacket: masteryPacketSchema
    }
  }, async ({ sessionId, evaluation: value }) => {
    const stored = await getStoredResult(sessionId);
    if (!stored) throw new Error("Session not found");
    if (!stored.submitted) throw new Error("Section must be submitted before evaluation");

    const packet = makeMasteryPacket(sessionId, value);
    await saveEvaluation(sessionId, packet);

    return {
      structuredContent: { masteryPacket: packet },
      content: [{
        type: "text",
        text:
          "Stored GRE evaluation for " + sessionId +
          ". Use the mastery packet to update the persistent GRE tracker when Drive access is available."
      }]
    };
  });

  registerAppTool(server, "get_gre_session_result", {
    title: "Get GRE session result",
    description:
      "Retrieve a previously submitted GRE section result and any stored evaluation. Use this to resume analysis after a reconnect or app restart.",
    inputSchema: {
      sessionId: z.string().min(1)
    },
    outputSchema: {
      found: z.boolean(),
      stored: z.object({
        sessionId: z.string(),
        section: z.any(),
        result: z.any().nullable(),
        evaluation: z.any().nullable(),
        submitted: z.boolean()
      }).nullable()
    }
  }, async ({ sessionId }) => {
    const stored = await getStoredResult(sessionId);
    return {
      structuredContent: { found: Boolean(stored), stored: stored || null },
      content: [{
        type: "text",
        text: stored
          ? "Retrieved GRE session " + sessionId + "."
          : "No GRE session found for " + sessionId + "."
      }]
    };
  });
}
