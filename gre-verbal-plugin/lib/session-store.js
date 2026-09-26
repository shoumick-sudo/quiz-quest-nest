import { isAnswered } from "./schemas.js";

const sessions = new Map();
const TTL_MS = 6 * 60 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [id, s] of sessions) if (now - s.updatedAt > TTL_MS) sessions.delete(id);
}

export function openSession(section) {
  prune();
  let s = sessions.get(section.sessionId);
  if (!s || s.submitted) {
    s = { section, responses: {}, marked: {}, updatedAt: Date.now(), submitted: false };
    sessions.set(section.sessionId, s);
  } else {
    s.section = section;
    s.updatedAt = Date.now();
  }
  return s;
}

export function getSession(id) {
  prune();
  return sessions.get(id);
}

export function saveResponse(session, r) {
  session.responses[r.questionId] = { ...(session.responses[r.questionId] || {}), ...r };
  if (typeof r.markedForReview === "boolean") session.marked[r.questionId] = r.markedForReview;
  session.updatedAt = Date.now();
}

export function snapshot(session) {
  const qs = session.section.questions;
  return {
    section: session.section,
    savedResponses: Object.values(session.responses),
    answeredQuestionIds: qs.filter((q) => isAnswered(q, session.responses[q.questionId])).map((q) => q.questionId),
    markedQuestionIds: qs.filter((q) => session.marked[q.questionId]).map((q) => q.questionId)
  };
}

export function finalize(session, elapsedSeconds, timedOut) {
  const qs = session.section.questions;
  const unansweredQuestionIds = qs.filter((q) => !isAnswered(q, session.responses[q.questionId])).map((q) => q.questionId);
  const markedQuestionIds = qs.filter((q) => session.marked[q.questionId]).map((q) => q.questionId);
  const responses = qs.map((q) => session.responses[q.questionId]).filter(Boolean);
  session.submitted = true;
  session.updatedAt = Date.now();
  return {
    sessionId: session.section.sessionId,
    accepted: true,
    totalQuestions: qs.length,
    answeredCount: qs.length - unansweredQuestionIds.length,
    unansweredQuestionIds,
    markedQuestionIds,
    elapsedSeconds,
    timedOut: Boolean(timedOut),
    responses
  };
}
