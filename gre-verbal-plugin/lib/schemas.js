import { z } from "zod";

export const choice = z.object({ id: z.string().min(1), label: z.string().min(1) });
export const blank = z.object({ id: z.string().min(1), label: z.string().optional(), choices: z.array(choice).min(2).max(8) });
export const sentence = z.object({ id: z.string().min(1), text: z.string().min(1) });

export const answerKey = z.object({
  selected: z.array(z.string().min(1)).optional(),
  blankSelections: z.array(z.object({
    blankId: z.string().min(1),
    choiceId: z.string().min(1)
  })).optional(),
  sentenceId: z.string().min(1).optional()
});

export const question = z.object({
  questionId: z.string().min(1),
  mode: z.enum(["practice", "test"]).default("practice"),
  sourceLabel: z.enum(["OFFICIAL-ETS", "ETS-DERIVED", "GENERATED-PRACTICE"]),
  questionType: z.enum(["TC", "SE", "RC", "ARGUMENT", "VOCAB", "MIXED"]),
  difficulty: z.enum(["FOUNDATION", "EASY", "MEDIUM", "HARD", "GRE-LEVEL MIXED"]),
  title: z.string().optional(),
  instructions: z.string().optional(),
  passage: z.string().optional(),
  stem: z.string().min(1),
  responseType: z.enum(["single", "multi", "tc_blanks", "select_in_passage"]).optional(),
  choiceMode: z.enum(["single", "multi"]).optional(),
  minSelections: z.number().int().min(1).optional(),
  maxSelections: z.number().int().min(1).optional(),
  choices: z.array(choice).min(2).max(12).optional(),
  blanks: z.array(blank).min(1).max(3).optional(),
  passageSentences: z.array(sentence).min(1).max(60).optional(),
  skillTags: z.array(z.string().min(1)).max(12).optional()
});

export const section = z.object({
  sessionId: z.string().min(1),
  title: z.string().min(1).default("GRE Verbal Section"),
  mode: z.enum(["practice", "test"]).default("test"),
  durationSeconds: z.number().int().min(60).max(7200).optional(),
  questions: z.array(question).min(1).max(40)
});

export const response = z.object({
  questionId: z.string().min(1),
  selected: z.array(z.string().min(1)).optional(),
  blankSelections: z.array(z.object({
    blankId: z.string().min(1),
    choiceId: z.string().min(1)
  })).optional(),
  sentenceId: z.string().min(1).optional(),
  learnerComment: z.string().max(6000).optional(),
  markedForReview: z.boolean().optional(),
  timeSpentSeconds: z.number().nonnegative().optional()
});

export function normalizeQuestion(q) {
  let responseType = q.responseType;
  if (!responseType) {
    if (q.questionType === "SE") responseType = "multi";
    else if (q.blanks?.length) responseType = "tc_blanks";
    else if (q.passageSentences?.length) responseType = "select_in_passage";
    else responseType = q.choiceMode || "single";
  }
  const out = { ...q, responseType, skillTags: q.skillTags || [] };
  if (responseType === "single" || responseType === "multi") {
    if (!q.choices?.length) throw new Error(q.questionId + ": choices required");
    out.minSelections = q.questionType === "SE" ? 2 : (q.minSelections || 1);
    out.maxSelections = q.questionType === "SE" ? 2 : (q.maxSelections || (responseType === "single" ? 1 : q.choices.length));
  }
  if (responseType === "tc_blanks" && !q.blanks?.length) throw new Error(q.questionId + ": blanks required");
  if (responseType === "select_in_passage" && !q.passageSentences?.length) throw new Error(q.questionId + ": passageSentences required");
  return out;
}

export function normalizeSection(s) {
  const seen = new Set();
  const questions = s.questions.map((q) => {
    const n = normalizeQuestion({ ...q, mode: s.mode });
    if (seen.has(n.questionId)) throw new Error("Duplicate questionId: " + n.questionId);
    seen.add(n.questionId);
    return n;
  });
  return { ...s, questions };
}

export function isAnswered(q, r) {
  if (!r) return false;
  if (q.responseType === "single") return Array.isArray(r.selected) && r.selected.length === 1;
  if (q.responseType === "multi") {
    const n = Array.isArray(r.selected) ? r.selected.length : 0;
    return n >= (q.minSelections || 1) && n <= (q.maxSelections || 99);
  }
  if (q.responseType === "tc_blanks") {
    const ids = new Set((r.blankSelections || []).map((x) => x.blankId));
    return q.blanks.every((b) => ids.has(b.id));
  }
  return q.responseType === "select_in_passage" ? Boolean(r.sentenceId) : false;
}
