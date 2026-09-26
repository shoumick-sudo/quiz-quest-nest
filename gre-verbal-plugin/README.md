# GRE Verbal Clickable Quiz Plugin — v0.4

This MCP Apps plugin provides a GRE Verbal practice, testing, mastery-dashboard, and spaced-retrieval engine inside ChatGPT.

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
- widget-state restoration
- recovery of final submission from client state if server state is lost

## v0.4 mastery dashboard
The new `render_gre_dashboard` tool renders an interactive dashboard showing:

- authoritative mastery snapshot cache
- evidence-based skill trends
- review-due count
- vocabulary due
- recurring error categories
- recent session accuracy
- next priorities
- Start Due Review and targeted-practice actions

Google Drive remains the source of truth for mastery. The plugin dashboard is a cached visualization plus evidence collected from completed sessions.

## v0.4 spaced retrieval
The review engine stores retrieval targets rather than replaying old questions.

Review target types:
- `skill`
- `error`
- `vocab`

After a completed evaluation, weak skills, meaningful error categories, and vocabulary weaknesses can automatically enter the review queue.

Retrieval outcomes:
- `again`
- `hard`
- `good`
- `easy`

Scheduling is deterministic and evidence-driven. Review questions should be generated in changed wording/context so the learner retrieves the principle rather than memorizing prior answers.

## Vocabulary tracking
Vocabulary review tracks:
- exposures
- successful retrievals
- lapses
- interval
- next due time
- current evidence status

A word is not treated as mastered after a single correct response.

## Mastery synchronization
`sync_gre_mastery_snapshot` lets ChatGPT cache the current Google Drive mastery state in the dashboard without changing the source-of-truth rule.

Supported mastery states:
- UNKNOWN
- INTRODUCED
- DEVELOPING
- PROFICIENT
- MASTERED
- REVIEW-DUE

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
1. ChatGPT selects a weak or due target.
2. The app renders one clickable question.
3. Learner submits.
4. ChatGPT diagnoses reasoning.
5. If the question is a spaced review, ChatGPT records the retrieval outcome.
6. The next target is selected adaptively.

## Test flow
1. ChatGPT renders a timed section.
2. Learner answers with no feedback.
3. Section submits.
4. ChatGPT grades and diagnoses.
5. `record_gre_evaluation` stores the structured evidence.
6. Weaknesses enter the review queue.
7. ChatGPT updates the authoritative Google Drive tracker using the mastery packet.

## Persistence
The runtime supports:
1. Postgres when `DATABASE_URL` is configured.
2. Memory fallback when it is not.

Postgres stores section state and the v0.4 learning-state document. The widget also keeps client-side recovery state.

A Render Postgres database named `gre-verbal-session-db` has been provisioned. Until `DATABASE_URL` is linked in the Render service, the deployed app uses memory fallback plus client-state recovery.

## Assessment integrity
Do not send answer keys or explanations to widget-visible question inputs. The plugin does not grade official or generated questions. ChatGPT evaluates only after submission.

## Production
Health:
`https://gre-verbal-clickable-quiz.onrender.com`

MCP:
`https://gre-verbal-clickable-quiz.onrender.com/mcp`

## Current limits
- Google Drive writes remain mediated by ChatGPT's Drive connector
- no server-side ETS item bank
- no plugin-side grading
- cross-device persistent learning state requires the Render Postgres connection to be enabled
