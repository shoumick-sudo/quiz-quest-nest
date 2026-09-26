import { isAnswered } from "./schemas.js";
import { databaseEnabled, dbQuery } from "./database.js";

const sessions = new Map();
const MEMORY_TTL_MS = 6 * 60 * 60 * 1000;

function pruneMemory() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.updatedAt > MEMORY_TTL_MS) sessions.delete(id);
  }
}

function fromRow(row) {
  if (!row) return null;
  return {
    section: row.section_json,
    responses: row.responses_json || {},
    marked: row.marked_json || {},
    submitted: Boolean(row.submitted),
    result: row.result_json || null,
    evaluation: row.evaluation_json || null,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
  };
}

async function persistSession(session) {
  if (!databaseEnabled) return;
  await dbQuery(
    `UPDATE gre_sessions
       SET section_json=$2, responses_json=$3, marked_json=$4,
           submitted=$5, result_json=$6, evaluation_json=$7, updated_at=NOW()
     WHERE session_id=$1`,
    [
      session.section.sessionId,
      session.section,
      session.responses,
      session.marked,
      session.submitted,
      session.result,
      session.evaluation
    ]
  );
}

export async function openSession(section) {
  if (!databaseEnabled) {
    pruneMemory();
    let s = sessions.get(section.sessionId);
    if (!s) {
      s = {
        section,
        responses: {},
        marked: {},
        submitted: false,
        result: null,
        evaluation: null,
        updatedAt: Date.now()
      };
      sessions.set(section.sessionId, s);
    } else {
      if (s.submitted) throw new Error("Session ID has already been submitted; use a new sessionId.");
      s.section = section;
      s.updatedAt = Date.now();
    }
    return s;
  }

  const existing = await dbQuery(
    "SELECT * FROM gre_sessions WHERE session_id=$1",
    [section.sessionId]
  );

  if (existing.rows.length) {
    const s = fromRow(existing.rows[0]);
    if (s.submitted) throw new Error("Session ID has already been submitted; use a new sessionId.");
    s.section = section;
    await persistSession(s);
    return s;
  }

  await dbQuery(
    `INSERT INTO gre_sessions
       (session_id, section_json, responses_json, marked_json, submitted)
     VALUES ($1,$2,$3,$4,FALSE)`,
    [section.sessionId, section, {}, {}]
  );
  return {
    section,
    responses: {},
    marked: {},
    submitted: false,
    result: null,
    evaluation: null,
    updatedAt: Date.now()
  };
}

export async function getSession(id) {
  if (!databaseEnabled) {
    pruneMemory();
    return sessions.get(id) || null;
  }
  const r = await dbQuery("SELECT * FROM gre_sessions WHERE session_id=$1", [id]);
  return fromRow(r.rows[0]);
}

export async function saveResponse(session, response) {
  session.responses[response.questionId] = {
    ...(session.responses[response.questionId] || {}),
    ...response
  };
  if (typeof response.markedForReview === "boolean") {
    session.marked[response.questionId] = response.markedForReview;
  }
  session.updatedAt = Date.now();
  if (!databaseEnabled) {
    sessions.set(session.section.sessionId, session);
    return;
  }
  await persistSession(session);
}

export function snapshot(session) {
  const qs = session.section.questions;
  return {
    section: session.section,
    savedResponses: Object.values(session.responses),
    answeredQuestionIds: qs
      .filter((q) => isAnswered(q, session.responses[q.questionId]))
      .map((q) => q.questionId),
    markedQuestionIds: qs
      .filter((q) => session.marked[q.questionId])
      .map((q) => q.questionId)
  };
}

export async function finalize(session, elapsedSeconds, timedOut) {
  const qs = session.section.questions;
  const unansweredQuestionIds = qs
    .filter((q) => !isAnswered(q, session.responses[q.questionId]))
    .map((q) => q.questionId);
  const markedQuestionIds = qs
    .filter((q) => session.marked[q.questionId])
    .map((q) => q.questionId);
  const responses = qs
    .map((q) => session.responses[q.questionId])
    .filter(Boolean);

  const result = {
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

  session.submitted = true;
  session.result = result;
  session.updatedAt = Date.now();

  if (!databaseEnabled) sessions.set(session.section.sessionId, session);
  else await persistSession(session);

  return result;
}

export async function saveEvaluation(sessionId, evaluation) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found");
  session.evaluation = evaluation;
  session.updatedAt = Date.now();
  if (!databaseEnabled) sessions.set(sessionId, session);
  else await persistSession(session);
  return session;
}

export async function getStoredResult(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return null;
  return {
    sessionId,
    section: session.section,
    result: session.result || null,
    evaluation: session.evaluation || null,
    submitted: session.submitted
  };
}

export function sessionPersistenceMode() {
  return databaseEnabled ? "postgres" : "memory";
}
