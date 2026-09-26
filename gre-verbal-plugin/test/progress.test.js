import test from "node:test";
import assert from "node:assert/strict";
import {
  ingestEvaluation,
  getDueReviews,
  recordReviewOutcome,
  dashboardData,
  syncMasterySnapshot
} from "../lib/progress-store.js";

test("evaluation creates skill, error, and vocab review targets", async () => {
  const learnerKey = "test-" + Date.now();
  await ingestEvaluation("session-a", {
    evaluatedAt: new Date().toISOString(),
    accuracy: 0.5,
    correctCount: 1,
    totalQuestions: 2,
    skillBreakdown: [],
    errorCategories: [
      { category: "unsupported inference", count: 1, evidence: "Selected beyond passage evidence" }
    ],
    vocabularyWeaknesses: ["equivocal"],
    masteryEvidence: [
      {
        skill: "RC inference",
        outcome: "incorrect",
        difficulty: "MEDIUM",
        evidence: "Unsupported inference"
      }
    ],
    officialItemsExposed: [],
    nextPriorities: ["evidence discipline"]
  }, learnerKey);

  const due = await getDueReviews({ learnerKey, limit: 20 });
  assert.ok(due.some((x) => x.type === "skill" && x.target === "RC inference"));
  assert.ok(due.some((x) => x.type === "error" && x.target === "unsupported inference"));
  assert.ok(due.some((x) => x.type === "vocab" && x.target === "equivocal"));

  const dash = await dashboardData(learnerKey);
  assert.equal(dash.dueReviewCount, 3);
  assert.equal(dash.nextPriorities[0], "evidence discipline");
});

test("review outcome schedules retrieval into the future", async () => {
  const learnerKey = "schedule-" + Date.now();
  await ingestEvaluation("session-b", {
    evaluatedAt: new Date().toISOString(),
    skillBreakdown: [],
    errorCategories: [],
    vocabularyWeaknesses: ["laconic"],
    masteryEvidence: [],
    officialItemsExposed: [],
    nextPriorities: []
  }, learnerKey);

  const [item] = await getDueReviews({ learnerKey, types: ["vocab"] });
  const updated = await recordReviewOutcome({
    learnerKey,
    reviewId: item.id,
    outcome: "good",
    evidence: "Correct active recall in context"
  });

  assert.equal(updated.intervalDays, 2);
  assert.ok(new Date(updated.dueAt).getTime() > Date.now());

  const due = await getDueReviews({ learnerKey, types: ["vocab"] });
  assert.equal(due.length, 0);
});

test("Drive mastery snapshot remains separately identified as authoritative cache", async () => {
  const learnerKey = "sync-" + Date.now();
  await syncMasterySnapshot({
    learnerKey,
    source: "GOOGLE-DRIVE",
    skills: [
      { skill: "Text Completion", state: "DEVELOPING", accuracy: 0.7 }
    ],
    vocabulary: [
      { word: "parsimonious", status: "INTRODUCED" }
    ]
  });

  const dash = await dashboardData(learnerKey);
  assert.equal(dash.masterySource, "GOOGLE-DRIVE");
  assert.equal(dash.skills[0].state, "DEVELOPING");
  assert.equal(dash.skills[0].skill, "Text Completion");
});
