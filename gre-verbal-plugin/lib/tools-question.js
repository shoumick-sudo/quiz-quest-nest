import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import {
  question,
  response,
  answerKey,
  normalizeQuestion
} from "./schemas.js";
import {
  registerGrading,
  getRegisteredQuestion,
  gradeQuestion
} from "./grading-store.js";

const gradingResultSchema = z.object({
  available: z.boolean(),
  revealed: z.boolean(),
  correct: z.boolean().nullable(),
  correctSelected: z.array(z.string()).optional(),
  correctBlankSelections: z.array(z.object({
    blankId: z.string(),
    choiceId: z.string()
  })).optional(),
  correctSentenceId: z.string().nullable().optional(),
  correctAnswerDisplay: z.string().nullable()
});

export function registerQuestionTools(server, templateUri) {
  registerAppTool(server, "render_gre_question", {
    title: "Render GRE question",
    description:
      "Render one clickable GRE Verbal item. Supports single-select, multi-select, multi-blank TC, and select-in-passage. For Practice mode, provide the private grading key so the app can reveal correctness immediately after submission. The grading key is never returned to the widget before submission.",
    inputSchema: {
      question,
      grading: answerKey.optional()
    },
    outputSchema: { question },
    _meta: {
      ui: { resourceUri: templateUri },
      "openai/outputTemplate": templateUri
    }
  }, async ({ question: q, grading }) => {
    const normalized = normalizeQuestion(q);
    registerGrading(normalized, grading || null);

    return {
      structuredContent: { question: normalized },
      content: [{
        type: "text",
        text:
          "Rendered GRE question " + normalized.questionId +
          (normalized.mode === "practice" && grading
            ? " with immediate answer reveal enabled."
            : ".")
      }]
    };
  });

  registerAppTool(server, "submit_gre_answer", {
    title: "Submit GRE answer",
    description:
      "Submit one standalone GRE response, optional learner reasoning/comment, and elapsed time. In Practice mode, return correctness and the correct answer immediately when a private grading key was registered. Do not provide an explanation; ChatGPT handles the explanation and Drive logging after submission.",
    inputSchema: {
      questionId: z.string(),
      selected: z.array(z.string()).optional(),
      blankSelections: response.shape.blankSelections,
      sentenceId: z.string().optional(),
      learnerComment: z.string().max(6000).optional(),
      elapsedSeconds: z.number().nonnegative().optional()
    },
    outputSchema: {
      submission: response.extend({
        accepted: z.boolean(),
        elapsedSeconds: z.number().nonnegative().optional()
      }),
      grading: gradingResultSchema,
      driveRecord: z.any()
    },
    _meta: { ui: { visibility: ["app"] } }
  }, async (args) => {
    const registered = getRegisteredQuestion(args.questionId);
    const grading = gradeQuestion(args.questionId, args);

    const driveRecord = {
      recordType: "QUESTION-NOTE",
      timestamp: new Date().toISOString(),
      sessionId: "single:" + args.questionId,
      questionId: args.questionId,
      mode: registered?.question?.mode || "practice",
      sourceType: registered?.question?.sourceLabel || null,
      questionType: registered?.question?.questionType || null,
      difficulty: registered?.question?.difficulty || null,
      skillTags: registered?.question?.skillTags || [],
      learnerAnswer: {
        selected: args.selected || [],
        blankSelections: args.blankSelections || [],
        sentenceId: args.sentenceId || null
      },
      correct: grading.revealed ? grading.correct : null,
      correctAnswer: grading.revealed ? grading.correctAnswerDisplay : null,
      learnerComment: args.learnerComment || "",
      elapsedSeconds: args.elapsedSeconds ?? null,
      driveDestination: {
        spreadsheet: "GRE Verbal Master Tracker",
        sheet: "Question Notes"
      }
    };

    return {
      structuredContent: {
        submission: {
          questionId: args.questionId,
          selected: args.selected,
          blankSelections: args.blankSelections,
          sentenceId: args.sentenceId,
          learnerComment: args.learnerComment,
          elapsedSeconds: args.elapsedSeconds,
          accepted: true
        },
        grading,
        driveRecord
      },
      content: [{
        type: "text",
        text:
          "Answer submitted for " + args.questionId +
          (grading.revealed
            ? grading.correct ? ". Correct." : ". Incorrect; the correct answer is available in structured output."
            : ".")
      }]
    };
  });
}
