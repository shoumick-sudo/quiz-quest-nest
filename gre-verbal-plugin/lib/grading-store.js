const registry = new Map();
const TTL_MS = 6 * 60 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [id, value] of registry) {
    if (now - value.createdAt > TTL_MS) registry.delete(id);
  }
}

function sort(values = []) {
  return [...values].sort();
}

function equalArrays(a = [], b = []) {
  const x = sort(a);
  const y = sort(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

function answerDisplay(question, key) {
  if (!key) return null;
  if (question.responseType === "tc_blanks") {
    const labels = new Map();
    for (const b of question.blanks || []) {
      for (const c of b.choices || []) labels.set(b.id + ":" + c.id, c.label);
    }
    return (key.blankSelections || []).map((x) => {
      const blank = (question.blanks || []).find((b) => b.id === x.blankId);
      const label = labels.get(x.blankId + ":" + x.choiceId);
      return (blank?.label || x.blankId) + ": " + x.choiceId + (label ? " — " + label : "");
    }).join("; ");
  }

  if (question.responseType === "select_in_passage") {
    const sentence = (question.passageSentences || []).find((s) => s.id === key.sentenceId);
    return sentence ? key.sentenceId + " — " + sentence.text : key.sentenceId || null;
  }

  const labels = new Map((question.choices || []).map((c) => [c.id, c.label]));
  return (key.selected || []).map((id) => id + (labels.get(id) ? " — " + labels.get(id) : "")).join("; ");
}

export function registerGrading(question, answerKey) {
  prune();
  registry.set(question.questionId, {
    question,
    answerKey,
    createdAt: Date.now()
  });
}

export function getRegisteredQuestion(questionId) {
  prune();
  return registry.get(questionId) || null;
}

export function gradeQuestion(questionId, response) {
  prune();
  const entry = registry.get(questionId);
  if (!entry?.answerKey) {
    return {
      available: false,
      revealed: false,
      correct: null,
      correctAnswerDisplay: null
    };
  }

  const { question, answerKey } = entry;

  if (question.mode === "test") {
    return {
      available: true,
      revealed: false,
      correct: null,
      correctAnswerDisplay: null
    };
  }

  let correct = false;

  if (question.responseType === "tc_blanks") {
    const expected = new Map((answerKey.blankSelections || []).map((x) => [x.blankId, x.choiceId]));
    const actual = new Map((response.blankSelections || []).map((x) => [x.blankId, x.choiceId]));
    correct = expected.size === actual.size && [...expected.entries()].every(([id, choice]) => actual.get(id) === choice);
  } else if (question.responseType === "select_in_passage") {
    correct = Boolean(answerKey.sentenceId) && response.sentenceId === answerKey.sentenceId;
  } else {
    correct = equalArrays(response.selected || [], answerKey.selected || []);
  }

  return {
    available: true,
    revealed: true,
    correct,
    correctSelected: answerKey.selected || [],
    correctBlankSelections: answerKey.blankSelections || [],
    correctSentenceId: answerKey.sentenceId || null,
    correctAnswerDisplay: answerDisplay(question, answerKey)
  };
}
