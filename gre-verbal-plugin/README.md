# GRE Verbal Clickable Quiz Plugin — v0.5

This MCP Apps plugin provides a GRE Verbal practice, testing, mastery-dashboard, and spaced-retrieval engine inside ChatGPT.

## v0.5 learner reasoning space

Every question now includes an optional writing area:

**Your reasoning / note**

The learner can write anything useful for instruction, including:
- why an answer was chosen
- which clue or sentence mattered
- where the difficulty was
- vocabulary uncertainty
- confusion between two choices
- a question for ChatGPT
- any other note the learner wants preserved

The note is submitted with the answer and is available to ChatGPT for diagnosis.

## v0.5 immediate Practice feedback

In **Practice mode**, the app can now reveal the answer immediately after Submit:

- selected answer remains visible
- correct answer is highlighted
- incorrect selection is highlighted separately
- Correct / Incorrect is shown immediately
- the correct answer is displayed
- no explanation is embedded in the widget

ChatGPT gives the explanation afterward and should explicitly use the learner's written reasoning when diagnosing the response.

For assessment integrity, **Test mode still does not reveal correctness until the test/section ends.**

## Private grading key

For Practice questions, `render_gre_question` accepts a private grading key. The server stores this key separately and does not return it in the pre-submission widget payload.

After the learner submits, `submit_gre_answer` returns only the grading result needed for immediate feedback.

## Google Drive source of truth

Google Drive remains the authoritative learning record.

The GRE Verbal Master Tracker now includes a **Question Notes** sheet for raw per-question records, including:
- timestamp
- session/question ID
- source type
- question type
- difficulty
- skill tags
- learner answer
- correctness
- correct answer
- learner comment / reasoning
- elapsed time
- later diagnosis / lesson / review information

The widget returns a structured `driveRecord` after Practice submission. Its follow-up message instructs ChatGPT to append this record to the Drive tracker before continuing, and to update Skill Mastery, Error Log, Vocabulary Review, and Session Log when evidence is meaningful.

The plugin itself does not authenticate directly to Google Drive; Drive writes are mediated by ChatGPT's already-connected Drive connector.

## Render / Postgres role

Render is **not** the source of truth for learning history.

Render/Postgres is useful for:
- keeping an active section alive across app/server restarts
- restoring navigation and review flags
- caching dashboard/review state for responsive UI
- resuming a submitted session quickly

If Render data is lost, the authoritative long-term learning record should still be reconstructable from Google Drive.

## Core test engine
- single-answer MCQ
- multi-select MCQ
- Sentence Equivalence with exactly two selections
- Text Completion with 1–3 independent blanks
- RC / argument passage questions
- select-in-passage
- timed sections
- Previous / Next navigation
- numbered navigator
- Mark for Review
- answer changing
- unanswered warning
- timeout auto-submit
- per-question timing
- learner comments on section questions
- widget-state restoration
- final-submission recovery from client state

## Mastery dashboard and spaced retrieval

The dashboard shows:
- authoritative mastery snapshot cache
- evidence-based skill trends
- review-due count
- vocabulary due
- recurring error categories
- recent session accuracy
- next priorities

Review target types:
- `skill`
- `error`
- `vocab`

Retrieval outcomes:
- `again`
- `hard`
- `good`
- `easy`

Review questions should use changed wording/context rather than replaying prior items.

## MCP tools

### Questions and sections
- `render_gre_question`
- `submit_gre_answer`
- `render_gre_section`
- `save_gre_response`
- `submit_gre_section`

### Evaluation and recovery
- `record_gre_evaluation`
- `get_gre_session_result`

### Dashboard and review
- `render_gre_dashboard`
- `get_due_gre_reviews`
- `record_gre_review_outcome`
- `sync_gre_mastery_snapshot`

## Practice flow

1. ChatGPT selects or generates a question.
2. ChatGPT sends the visible question plus a private grading key to the app.
3. Learner selects an answer.
4. Learner optionally writes reasoning/comments.
5. Learner presses Submit.
6. Widget immediately shows Correct/Incorrect and the correct answer.
7. ChatGPT receives the answer, learner comment, grading result, and Drive record.
8. ChatGPT saves the record to Google Drive.
9. ChatGPT explains and diagnoses the reasoning.
10. ChatGPT adapts the next question.

## Test flow

1. ChatGPT renders a timed section.
2. Learner answers and may write private notes, but receives no correctness feedback.
3. Section submits.
4. ChatGPT grades and diagnoses.
5. Learner comments are preserved in the Drive Question Notes log.
6. `record_gre_evaluation` stores structured evidence.
7. ChatGPT updates the authoritative Google Drive tracker.

## Production

Health:
`https://gre-verbal-clickable-quiz.onrender.com`

MCP:
`https://gre-verbal-clickable-quiz.onrender.com/mcp`

## Remaining infrastructure note

A Render Postgres database is provisioned but not required for the Google Drive learning record. Linking `DATABASE_URL` is only for stronger app/session continuity and cache persistence.
