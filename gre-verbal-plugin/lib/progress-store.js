import { databaseEnabled, dbQuery } from "./database.js";

const memory = new Map();
const DEFAULT_KEY = "default";

function blankState() {
  return {
    version: "0.4",
    skills: {},
    errorCounts: {},
    vocabulary: {},
    reviewQueue: [],
    nextPriorities: [],
    recentSessions: [],
    masterySnapshot: {
      source: "evaluation-evidence",
      syncedAt: null,
      skills: {}
    },
    updatedAt: new Date().toISOString()
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeState(value) {
  const base = blankState();
  const state = { ...base, ...(value || {}) };
  state.skills = state.skills || {};
  state.errorCounts = state.errorCounts || {};
  state.vocabulary = state.vocabulary || {};
  state.reviewQueue = Array.isArray(state.reviewQueue) ? state.reviewQueue : [];
  state.nextPriorities = Array.isArray(state.nextPriorities) ? state.nextPriorities : [];
  state.recentSessions = Array.isArray(state.recentSessions) ? state.recentSessions : [];
  state.masterySnapshot = {
    ...base.masterySnapshot,
    ...(state.masterySnapshot || {}),
    skills: state.masterySnapshot?.skills || {}
  };
  return state;
}

export async function getLearningState(learnerKey = DEFAULT_KEY) {
  if (!databaseEnabled) {
    if (!memory.has(learnerKey)) memory.set(learnerKey, blankState());
    return clone(memory.get(learnerKey));
  }

  const result = await dbQuery(
    "SELECT state_json FROM gre_learning_state WHERE learner_key=$1",
    [learnerKey]
  );
  if (!result.rows.length) {
    const state = blankState();
    await dbQuery(
      "INSERT INTO gre_learning_state (learner_key, state_json) VALUES ($1,$2)",
      [learnerKey, state]
    );
    return state;
  }
  return normalizeState(result.rows[0].state_json);
}

export async function saveLearningState(state, learnerKey = DEFAULT_KEY) {
  const normalized = normalizeState(state);
  normalized.updatedAt = new Date().toISOString();

  if (!databaseEnabled) {
    memory.set(learnerKey, clone(normalized));
    return normalized;
  }

  await dbQuery(
    `INSERT INTO gre_learning_state (learner_key, state_json, updated_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (learner_key)
     DO UPDATE SET state_json=EXCLUDED.state_json, updated_at=NOW()`,
    [learnerKey, normalized]
  );
  return normalized;
}

function queueId(type, target) {
  return type + ":" + String(target).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function findQueueItem(state, type, target) {
  const id = queueId(type, target);
  return state.reviewQueue.find((x) => x.id === id);
}

function ensureReviewItem(state, {
  type,
  target,
  reason,
  sourceSessionId,
  priority = 3,
  dueAt = new Date().toISOString()
}) {
  const id = queueId(type, target);
  let item = state.reviewQueue.find((x) => x.id === id);

  if (!item) {
    item = {
      id,
      type,
      target,
      reason,
      sourceSessionId,
      priority,
      dueAt,
      intervalDays: 0,
      repetitions: 0,
      lapses: 0,
      status: "scheduled",
      lastOutcome: null,
      lastReviewedAt: null,
      createdAt: new Date().toISOString()
    };
    state.reviewQueue.push(item);
  } else {
    item.reason = reason || item.reason;
    item.sourceSessionId = sourceSessionId || item.sourceSessionId;
    item.priority = Math.max(item.priority || 1, priority);
    if (new Date(dueAt) < new Date(item.dueAt)) item.dueAt = dueAt;
    if (item.status === "retired") item.status = "scheduled";
  }

  return item;
}

function updateSkillEvidence(state, evidence, now) {
  const key = evidence.skill;
  const skill = state.skills[key] || {
    skill: key,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    mixed: 0,
    lastDifficulty: null,
    lastReasoningQuality: null,
    lastSeenAt: null
  };
  skill.attempts += 1;
  skill[evidence.outcome] = (skill[evidence.outcome] || 0) + 1;
  skill.lastDifficulty = evidence.difficulty || skill.lastDifficulty;
  skill.lastReasoningQuality = evidence.reasoningQuality || skill.lastReasoningQuality;
  skill.lastSeenAt = now;
  state.skills[key] = skill;
}

export async function ingestEvaluation(sessionId, packet, learnerKey = DEFAULT_KEY) {
  const state = await getLearningState(learnerKey);
  const now = new Date().toISOString();

  for (const evidence of packet.masteryEvidence || []) {
    updateSkillEvidence(state, evidence, now);
    if (evidence.outcome !== "correct") {
      ensureReviewItem(state, {
        type: "skill",
        target: evidence.skill,
        reason: evidence.evidence,
        sourceSessionId: sessionId,
        priority: evidence.outcome === "incorrect" ? 5 : 4
      });
    }
  }

  for (const error of packet.errorCategories || []) {
    state.errorCounts[error.category] = (state.errorCounts[error.category] || 0) + error.count;
    ensureReviewItem(state, {
      type: "error",
      target: error.category,
      reason: error.evidence || "Recurring GRE reasoning error",
      sourceSessionId: sessionId,
      priority: Math.min(5, 2 + error.count)
    });
  }

  for (const word of packet.vocabularyWeaknesses || []) {
    const key = word.trim().toLowerCase();
    const vocab = state.vocabulary[key] || {
      word,
      exposures: 0,
      successfulRetrievals: 0,
      lapses: 0,
      dueAt: now,
      intervalDays: 0,
      status: "DEVELOPING",
      lastReviewedAt: null
    };
    vocab.exposures += 1;
    vocab.dueAt = now;
    vocab.status = vocab.status === "UNKNOWN" ? "INTRODUCED" : vocab.status;
    state.vocabulary[key] = vocab;

    ensureReviewItem(state, {
      type: "vocab",
      target: word,
      reason: "Vocabulary weakness identified in GRE work",
      sourceSessionId: sessionId,
      priority: 4
    });
  }

  state.nextPriorities = (packet.nextPriorities || []).slice(0, 12);
  state.recentSessions = [
    {
      sessionId,
      evaluatedAt: packet.evaluatedAt,
      accuracy: packet.accuracy,
      correctCount: packet.correctCount,
      totalQuestions: packet.totalQuestions,
      pacingSummary: packet.pacingSummary || null
    },
    ...state.recentSessions.filter((x) => x.sessionId !== sessionId)
  ].slice(0, 12);

  return saveLearningState(state, learnerKey);
}

function scheduleForOutcome(item, outcome, nowMs) {
  const current = Math.max(0, Number(item.intervalDays || 0));
  let days;

  if (outcome === "again") {
    days = 0;
    item.lapses = (item.lapses || 0) + 1;
    item.repetitions = 0;
  } else if (outcome === "hard") {
    days = Math.max(1, Math.round(current * 1.2) || 1);
    item.repetitions = (item.repetitions || 0) + 1;
  } else if (outcome === "good") {
    days = current <= 0 ? 2 : Math.max(2, Math.round(current * 2.3));
    item.repetitions = (item.repetitions || 0) + 1;
  } else {
    days = current <= 0 ? 4 : Math.max(4, Math.round(current * 3.2));
    item.repetitions = (item.repetitions || 0) + 1;
  }

  item.intervalDays = days;
  item.lastOutcome = outcome;
  item.lastReviewedAt = new Date(nowMs).toISOString();
  item.dueAt = new Date(
    nowMs + (days === 0 ? 10 * 60 * 1000 : days * 24 * 60 * 60 * 1000)
  ).toISOString();

  if (outcome === "easy" && item.repetitions >= 4 && item.type !== "vocab") {
    item.status = "retired";
  } else {
    item.status = "scheduled";
  }
}

export async function recordReviewOutcome({
  reviewId,
  outcome,
  learnerKey = DEFAULT_KEY,
  evidence
}) {
  const state = await getLearningState(learnerKey);
  const item = state.reviewQueue.find((x) => x.id === reviewId);
  if (!item) throw new Error("Review item not found");

  scheduleForOutcome(item, outcome, Date.now());
  if (evidence) item.lastEvidence = evidence;

  if (item.type === "vocab") {
    const key = item.target.trim().toLowerCase();
    const vocab = state.vocabulary[key] || {
      word: item.target,
      exposures: 0,
      successfulRetrievals: 0,
      lapses: 0,
      dueAt: item.dueAt,
      intervalDays: 0,
      status: "DEVELOPING"
    };

    vocab.lastReviewedAt = item.lastReviewedAt;
    vocab.dueAt = item.dueAt;
    vocab.intervalDays = item.intervalDays;
    if (outcome === "again") {
      vocab.lapses = (vocab.lapses || 0) + 1;
      vocab.status = "DEVELOPING";
    } else {
      vocab.successfulRetrievals = (vocab.successfulRetrievals || 0) + 1;
      if (vocab.successfulRetrievals >= 4 && outcome === "easy") vocab.status = "PROFICIENT";
      else if (vocab.successfulRetrievals >= 2) vocab.status = "DEVELOPING";
    }
    state.vocabulary[key] = vocab;
  }

  await saveLearningState(state, learnerKey);
  return clone(item);
}

export async function getDueReviews({
  learnerKey = DEFAULT_KEY,
  limit = 10,
  types = []
} = {}) {
  const state = await getLearningState(learnerKey);
  const now = Date.now();
  return state.reviewQueue
    .filter((x) =>
      x.status !== "retired" &&
      new Date(x.dueAt).getTime() <= now &&
      (!types.length || types.includes(x.type))
    )
    .sort((a, b) =>
      (b.priority || 0) - (a.priority || 0) ||
      new Date(a.dueAt) - new Date(b.dueAt)
    )
    .slice(0, limit);
}

export async function syncMasterySnapshot({
  learnerKey = DEFAULT_KEY,
  skills = [],
  vocabulary = [],
  source = "GOOGLE-DRIVE"
}) {
  const state = await getLearningState(learnerKey);
  const syncedAt = new Date().toISOString();
  const skillMap = {};
  for (const skill of skills) skillMap[skill.skill] = { ...skill };
  state.masterySnapshot = {
    source,
    syncedAt,
    skills: skillMap
  };

  for (const v of vocabulary) {
    const key = v.word.trim().toLowerCase();
    state.vocabulary[key] = {
      ...(state.vocabulary[key] || { word: v.word, exposures: 0, successfulRetrievals: 0, lapses: 0 }),
      ...v
    };
  }
  return saveLearningState(state, learnerKey);
}

export async function dashboardData(learnerKey = DEFAULT_KEY) {
  const state = await getLearningState(learnerKey);
  const due = await getDueReviews({ learnerKey, limit: 50 });
  const errors = Object.entries(state.errorCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const vocabularyDue = Object.values(state.vocabulary)
    .filter((v) => !v.dueAt || new Date(v.dueAt).getTime() <= Date.now())
    .sort((a, b) => (b.lapses || 0) - (a.lapses || 0))
    .slice(0, 12);

  const skills = Object.values(state.masterySnapshot.skills || {});
  const evidenceSkills = Object.values(state.skills || {});

  return {
    learnerKey,
    updatedAt: state.updatedAt,
    masterySource: state.masterySnapshot.source,
    masterySyncedAt: state.masterySnapshot.syncedAt,
    skills,
    evidenceSkills,
    topErrors: errors,
    vocabularyDue,
    dueReviews: due.slice(0, 12),
    dueReviewCount: due.length,
    nextPriorities: state.nextPriorities,
    recentSessions: state.recentSessions.slice(0, 8)
  };
}
