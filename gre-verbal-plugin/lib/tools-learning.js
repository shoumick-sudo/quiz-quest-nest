import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import {
  dashboardData,
  getDueReviews,
  recordReviewOutcome,
  syncMasterySnapshot
} from "./progress-store.js";

const masteryState = z.enum([
  "UNKNOWN",
  "INTRODUCED",
  "DEVELOPING",
  "PROFICIENT",
  "MASTERED",
  "REVIEW-DUE"
]);

const dashboardSchema = z.object({
  learnerKey: z.string(),
  updatedAt: z.string(),
  masterySource: z.string(),
  masterySyncedAt: z.string().nullable(),
  skills: z.array(z.any()),
  evidenceSkills: z.array(z.any()),
  topErrors: z.array(z.object({
    category: z.string(),
    count: z.number().int()
  })),
  vocabularyDue: z.array(z.any()),
  dueReviews: z.array(z.any()),
  dueReviewCount: z.number().int(),
  nextPriorities: z.array(z.string()),
  recentSessions: z.array(z.any())
});

export function registerLearningTools(server, dashboardUri) {
  registerAppTool(server, "render_gre_dashboard", {
    title: "Render GRE mastery dashboard",
    description:
      "Render the learner's GRE Verbal progress dashboard, review-due queue, vocabulary weaknesses, error trends, recent sessions, and next priorities. This dashboard is a cache/summary; Google Drive remains the authoritative mastery record.",
    inputSchema: {
      learnerKey: z.string().min(1).optional()
    },
    outputSchema: {
      dashboard: dashboardSchema
    },
    _meta: {
      ui: { resourceUri: dashboardUri },
      "openai/outputTemplate": dashboardUri
    }
  }, async ({ learnerKey }) => {
    const dashboard = await dashboardData(learnerKey || "default");
    return {
      structuredContent: { dashboard },
      content: [{
        type: "text",
        text:
          "Rendered GRE Verbal dashboard. Google Drive remains the authoritative mastery record."
      }]
    };
  });

  registerAppTool(server, "get_due_gre_reviews", {
    title: "Get due GRE reviews",
    description:
      "Return due spaced-retrieval targets for skills, reasoning errors, and vocabulary. Use these targets to generate changed-context review questions rather than replaying prior items.",
    inputSchema: {
      learnerKey: z.string().min(1).optional(),
      limit: z.number().int().min(1).max(30).optional(),
      types: z.array(z.enum(["skill", "error", "vocab"])).max(3).optional()
    },
    outputSchema: {
      reviews: z.array(z.any())
    },
    _meta: {}
  }, async ({ learnerKey, limit, types }) => {
    const reviews = await getDueReviews({
      learnerKey: learnerKey || "default",
      limit: limit || 10,
      types: types || []
    });
    return {
      structuredContent: { reviews },
      content: [{
        type: "text",
        text: reviews.length
          ? "Found " + reviews.length + " due GRE review target(s)."
          : "No GRE review targets are currently due."
      }]
    };
  });

  registerAppTool(server, "record_gre_review_outcome", {
    title: "Record GRE review outcome",
    description:
      "Record the learner's retrieval outcome for one due review target and schedule its next review. Use again/hard/good/easy based on demonstrated retrieval, not encouragement.",
    inputSchema: {
      learnerKey: z.string().min(1).optional(),
      reviewId: z.string().min(1),
      outcome: z.enum(["again", "hard", "good", "easy"]),
      evidence: z.string().min(1).optional()
    },
    outputSchema: {
      review: z.any()
    },
    _meta: {}
  }, async ({ learnerKey, reviewId, outcome, evidence }) => {
    const review = await recordReviewOutcome({
      learnerKey: learnerKey || "default",
      reviewId,
      outcome,
      evidence
    });
    return {
      structuredContent: { review },
      content: [{
        type: "text",
        text: "Updated spaced review schedule for " + review.target + "."
      }]
    };
  });

  registerAppTool(server, "sync_gre_mastery_snapshot", {
    title: "Sync GRE mastery snapshot",
    description:
      "Cache an authoritative mastery snapshot from the project's Google Drive tracker so the dashboard reflects the source of truth. This does not replace or write to Drive.",
    inputSchema: {
      learnerKey: z.string().min(1).optional(),
      source: z.string().min(1).optional(),
      skills: z.array(z.object({
        skill: z.string().min(1),
        state: masteryState,
        difficulty: z.string().optional(),
        accuracy: z.number().min(0).max(1).optional(),
        reviewDue: z.string().optional(),
        notes: z.string().optional()
      })).max(100),
      vocabulary: z.array(z.object({
        word: z.string().min(1),
        status: masteryState.optional(),
        recognition: z.string().optional(),
        activeRecall: z.string().optional(),
        contextualMeaning: z.string().optional(),
        dueAt: z.string().optional(),
        intervalDays: z.number().nonnegative().optional()
      })).max(500).optional()
    },
    outputSchema: {
      synced: z.boolean(),
      syncedAt: z.string()
    },
    _meta: {}
  }, async ({ learnerKey, source, skills, vocabulary }) => {
    const state = await syncMasterySnapshot({
      learnerKey: learnerKey || "default",
      source: source || "GOOGLE-DRIVE",
      skills,
      vocabulary: vocabulary || []
    });
    return {
      structuredContent: {
        synced: true,
        syncedAt: state.masterySnapshot.syncedAt
      },
      content: [{
        type: "text",
        text: "Cached authoritative GRE mastery snapshot for dashboard display."
      }]
    };
  });
}
