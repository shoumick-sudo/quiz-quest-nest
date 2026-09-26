import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuestion, normalizeSection, isAnswered } from "../lib/schemas.js";
import {
  openSession,
  getSession,
  saveResponse,
  finalize,
  saveEvaluation,
  getStoredResult
} from "../lib/session-store.js";

test("Sentence Equivalence enforces exactly two selections", () => {
  const q = normalizeQuestion({
    questionId: "se-1",
    mode: "test",
    sourceLabel: "GENERATED-PRACTICE",
    questionType: "SE",
    difficulty: "MEDIUM",
    stem: "Test stem",
    choices: [
      { id: "A", label: "a" }, { id: "B", label: "b" },
      { id: "C", label: "c" }, { id: "D", label: "d" },
      { id: "E", label: "e" }, { id: "F", label: "f" }
    ]
  });
  assert.equal(q.responseType, "multi");
  assert.equal(q.minSelections, 2);
  assert.equal(q.maxSelections, 2);
  assert.equal(isAnswered(q, { selected: ["A"] }), false);
  assert.equal(isAnswered(q, { selected: ["A", "B"] }), true);
});

test("multi-blank TC requires every blank", () => {
  const q = normalizeQuestion({
    questionId: "tc-1",
    mode: "practice",
    sourceLabel: "GENERATED-PRACTICE",
    questionType: "TC",
    difficulty: "MEDIUM",
    stem: "Test stem",
    blanks: [
      { id: "b1", choices: [{ id: "A", label: "a" }, { id: "B", label: "b" }] },
      { id: "b2", choices: [{ id: "C", label: "c" }, { id: "D", label: "d" }] }
    ]
  });
  assert.equal(q.responseType, "tc_blanks");
  assert.equal(isAnswered(q, { blankSelections: [{ blankId: "b1", choiceId: "A" }] }), false);
  assert.equal(isAnswered(q, {
    blankSelections: [
      { blankId: "b1", choiceId: "A" },
      { blankId: "b2", choiceId: "D" }
    ]
  }), true);
});

test("section responses survive the full in-memory lifecycle", async () => {
  const section = normalizeSection({
    sessionId: "test-session-" + Date.now(),
    title: "Test Section",
    mode: "test",
    durationSeconds: 300,
    questions: [{
      questionId: "q1",
      sourceLabel: "GENERATED-PRACTICE",
      questionType: "RC",
      difficulty: "EASY",
      stem: "Test?",
      responseType: "single",
      choices: [{ id: "A", label: "a" }, { id: "B", label: "b" }]
    }]
  });

  const session = await openSession(section);
  await saveResponse(session, {
    questionId: "q1",
    selected: ["B"],
    markedForReview: true,
    timeSpentSeconds: 12
  });

  const loaded = await getSession(section.sessionId);
  assert.deepEqual(loaded.responses.q1.selected, ["B"]);

  const result = await finalize(loaded, 12, false);
  assert.equal(result.accepted, true);
  assert.equal(result.answeredCount, 1);
  assert.deepEqual(result.markedQuestionIds, ["q1"]);

  await saveEvaluation(section.sessionId, {
    packetVersion: "1.0",
    sessionId: section.sessionId,
    evaluatedAt: new Date().toISOString(),
    skillBreakdown: [],
    errorCategories: [],
    vocabularyWeaknesses: [],
    masteryEvidence: [],
    officialItemsExposed: [],
    nextPriorities: [],
    persistenceInstruction: "test"
  });

  const stored = await getStoredResult(section.sessionId);
  assert.equal(stored.submitted, true);
  assert.equal(stored.result.answeredCount, 1);
  assert.equal(stored.evaluation.packetVersion, "1.0");
});
