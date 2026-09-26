import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuestion } from "../lib/schemas.js";
import { registerGrading, gradeQuestion } from "../lib/grading-store.js";

test("practice single-select grading reveals immediately", () => {
  const q = normalizeQuestion({
    questionId: "grade-single",
    mode: "practice",
    sourceLabel: "GENERATED-PRACTICE",
    questionType: "TC",
    difficulty: "EASY",
    stem: "Stem",
    responseType: "single",
    choices: [
      { id: "A", label: "alpha" },
      { id: "B", label: "beta" }
    ]
  });
  registerGrading(q, { selected: ["B"] });
  const result = gradeQuestion(q.questionId, { selected: ["A"] });
  assert.equal(result.revealed, true);
  assert.equal(result.correct, false);
  assert.match(result.correctAnswerDisplay, /^B/);
});

test("practice multi-blank grading compares all blanks", () => {
  const q = normalizeQuestion({
    questionId: "grade-tc",
    mode: "practice",
    sourceLabel: "GENERATED-PRACTICE",
    questionType: "TC",
    difficulty: "MEDIUM",
    stem: "Stem",
    responseType: "tc_blanks",
    blanks: [
      { id: "b1", label: "Blank (i)", choices: [{ id: "A", label: "a" }, { id: "B", label: "b" }] },
      { id: "b2", label: "Blank (ii)", choices: [{ id: "C", label: "c" }, { id: "D", label: "d" }] }
    ]
  });
  registerGrading(q, {
    blankSelections: [
      { blankId: "b1", choiceId: "B" },
      { blankId: "b2", choiceId: "D" }
    ]
  });
  const result = gradeQuestion(q.questionId, {
    blankSelections: [
      { blankId: "b1", choiceId: "B" },
      { blankId: "b2", choiceId: "D" }
    ]
  });
  assert.equal(result.correct, true);
  assert.equal(result.revealed, true);
});

test("test mode never reveals correctness immediately", () => {
  const q = normalizeQuestion({
    questionId: "grade-test",
    mode: "test",
    sourceLabel: "GENERATED-PRACTICE",
    questionType: "SE",
    difficulty: "MEDIUM",
    stem: "Stem",
    choices: [
      { id: "A", label: "a" }, { id: "B", label: "b" },
      { id: "C", label: "c" }, { id: "D", label: "d" },
      { id: "E", label: "e" }, { id: "F", label: "f" }
    ]
  });
  registerGrading(q, { selected: ["A", "B"] });
  const result = gradeQuestion(q.questionId, { selected: ["A", "B"] });
  assert.equal(result.available, true);
  assert.equal(result.revealed, false);
  assert.equal(result.correct, null);
});
