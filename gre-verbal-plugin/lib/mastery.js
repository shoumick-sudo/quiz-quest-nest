import { z } from "zod";

export const skillBreakdown = z.object({
  skill: z.string().min(1),
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
  difficulty: z.string().optional(),
  notes: z.string().optional()
});

export const errorCategory = z.object({
  category: z.string().min(1),
  count: z.number().int().min(1),
  evidence: z.string().optional()
});

export const masteryEvidence = z.object({
  skill: z.string().min(1),
  outcome: z.enum(["correct", "incorrect", "mixed"]),
  difficulty: z.string().optional(),
  reasoningQuality: z.enum(["weak", "partial", "sound", "strong"]).optional(),
  timingSeconds: z.number().nonnegative().optional(),
  sourceLabel: z.enum(["OFFICIAL-ETS", "ETS-DERIVED", "GENERATED-PRACTICE"]).optional(),
  evidence: z.string().min(1)
});

export const officialExposure = z.object({
  itemId: z.string().min(1),
  status: z.enum(["EXPOSED", "PRACTICED", "TESTED", "REVIEWED"])
});

export const evaluation = z.object({
  correctCount: z.number().int().min(0).optional(),
  totalQuestions: z.number().int().min(0).optional(),
  accuracy: z.number().min(0).max(1).optional(),
  skillBreakdown: z.array(skillBreakdown).max(50).default([]),
  errorCategories: z.array(errorCategory).max(30).default([]),
  vocabularyWeaknesses: z.array(z.string().min(1)).max(100).default([]),
  masteryEvidence: z.array(masteryEvidence).max(100).default([]),
  officialItemsExposed: z.array(officialExposure).max(100).default([]),
  nextPriorities: z.array(z.string().min(1)).max(20).default([]),
  pacingSummary: z.string().optional(),
  notes: z.string().optional()
});

export function makeMasteryPacket(sessionId, value) {
  const now = new Date().toISOString();
  return {
    packetVersion: "1.0",
    sessionId,
    evaluatedAt: now,
    accuracy: value.accuracy ?? (
      Number.isInteger(value.correctCount) && value.totalQuestions
        ? value.correctCount / value.totalQuestions
        : undefined
    ),
    correctCount: value.correctCount,
    totalQuestions: value.totalQuestions,
    skillBreakdown: value.skillBreakdown || [],
    errorCategories: value.errorCategories || [],
    vocabularyWeaknesses: value.vocabularyWeaknesses || [],
    masteryEvidence: value.masteryEvidence || [],
    officialItemsExposed: value.officialItemsExposed || [],
    nextPriorities: value.nextPriorities || [],
    pacingSummary: value.pacingSummary,
    notes: value.notes,
    persistenceInstruction:
      "Use this packet as evidence when updating the GRE Verbal Master Tracker and learner-state files. Do not infer mastery states beyond the evidence."
  };
}
