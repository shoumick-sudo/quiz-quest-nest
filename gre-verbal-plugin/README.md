# GRE Verbal Clickable Quiz Plugin — v0.3

This MCP Apps plugin provides a GRE Verbal practice, testing, and mastery-evidence engine inside ChatGPT.

## Question engine
- single-answer MCQ
- multi-select MCQ
- Sentence Equivalence with exactly two selections
- Text Completion with 1–3 independent blanks
- RC / argument passage questions
- select-in-passage sentence selection
- source, difficulty, and skill metadata

## Section engine
- timed sections
- Previous / Next
- numbered question navigator
- answered-state indicators
- Mark for Review
- answer changing
- unanswered-question warning
- timeout auto-submit
- per-question time capture
- widget-state restoration
- resumable server-side section sessions

## v0.3 persistence
The runtime supports two persistence modes:

1. **Postgres** when `DATABASE_URL` is configured.
2. **Memory fallback** when no database is configured.

The Postgres adapter stores:
- section definition
- saved responses
- review flags
- submission state
- final section result
- post-test mastery evaluation packet

The app health endpoint reports the active persistence mode and database health.

## Mastery handoff
After ChatGPT grades a completed section, it can call:

- `record_gre_evaluation`

This stores structured evidence including:
- accuracy
- skill breakdown
- error categories
- vocabulary weaknesses
- mastery evidence
- official-item exposure status
- pacing summary
- next priorities

The tool returns a **mastery packet** intended for the project's persistent Google Drive tracker.

To resume analysis later, ChatGPT can call:

- `get_gre_session_result`

That retrieves the stored section result and any saved evaluation.

## MCP tools
- `render_gre_question`
- `submit_gre_answer`
- `render_gre_section`
- `save_gre_response`
- `submit_gre_section`
- `record_gre_evaluation`
- `get_gre_session_result`

## Assessment integrity
Do not put answer keys or explanations into widget-visible question inputs. The plugin records learner responses. ChatGPT grades after submission when the answer key is available in context.

## Recommended Project behavior
Use `render_gre_question` for one-at-a-time teaching and practice. Use `render_gre_section` for diagnostics, timed sections, and GRE-section simulations. During Test mode, provide no correctness feedback until submission. After grading, call `record_gre_evaluation`, then use the returned mastery packet as evidence when updating the Drive tracker.

## Runtime
Local health: `http://localhost:8787/`
Local MCP: `http://localhost:8787/mcp`

Production MCP:
`https://gre-verbal-clickable-quiz.onrender.com/mcp`

## Remaining infrastructure step
A free Render Postgres database has been provisioned for durable sessions. The web service still needs its `DATABASE_URL` environment variable linked to that database. Until that is done, v0.3 automatically falls back to in-memory sessions.

## Current limits
- direct Google Drive writes are still handled by ChatGPT's Drive connector rather than the plugin
- no grading inside the plugin
- no ETS item bank stored on the server
- Render free Postgres has a provider-defined expiration period

Long-term mastery remains in the project's Google Drive tracker.
