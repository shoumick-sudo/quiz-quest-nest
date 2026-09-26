# GRE Verbal Clickable Quiz Plugin — v0.2

This MCP Apps plugin provides a GRE Verbal practice and test engine inside ChatGPT.

## Question engine
- single-answer MCQ
- multi-select MCQ
- Sentence Equivalence with exactly two selections
- Text Completion with 1–3 independent blanks
- RC/argument passage questions
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
- server-side session state with a 6-hour TTL

## MCP tools
- render_gre_question — one-at-a-time Teach/Practice question
- render_gre_section — full diagnostic or timed section
- save_gre_response — widget-only response persistence
- submit_gre_answer — standalone response submission
- submit_gre_section — section finalization and structured response summary

## Assessment integrity
Do not put answer keys or explanations into plugin inputs. The plugin records learner responses; ChatGPT grades only after submission when the answer key is available in context.

## Recommended Project behavior
Use render_gre_question for one-at-a-time teaching and practice. Use render_gre_section for diagnostics, timed sections, and GRE-section simulations. In Practice mode, evaluate only after submission. In Test mode, provide no correctness feedback until the section is submitted.

## Runtime
Health: http://localhost:8787/
MCP: http://localhost:8787/mcp

Production MCP:
https://gre-verbal-clickable-quiz.onrender.com/mcp

## Current limits
- server session storage is in memory and can be lost on a host restart
- no authenticated cross-device persistence yet
- no direct Google Drive writes from the plugin
- no grading inside the plugin
- no ETS item bank stored on the server

Long-term mastery remains in the project's Google Drive tracker.
