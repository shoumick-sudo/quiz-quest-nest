# GRE Verbal Clickable Quiz Plugin — MVP

This MCP Apps plugin renders GRE Verbal multiple-choice questions as clickable UI inside ChatGPT.

## MVP

- `render_gre_question` renders one GRE-style question.
- Single-select uses radio buttons.
- Multi-select uses checkboxes.
- `submit_gre_answer` records the learner's selected choice IDs and elapsed time.
- The widget does not receive the answer key.
- ChatGPT remains responsible for grading, tutoring, adaptive sequencing, and Test/Practice behavior.

## Run locally

```bash
npm install
npm start
```

Server endpoints:

- Health: `http://localhost:8787/`
- MCP: `http://localhost:8787/mcp`

## MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest
```

Connect with Streamable HTTP to:

```text
http://localhost:8787/mcp
```

## Project instruction after connection

> For every MCQ, use the GRE Quiz plugin's `render_gre_question` tool instead of writing answer choices as plain prose. Present one question at a time unless I request a batch. Treat widget submissions as the learner's answer. In Practice mode, evaluate after submission; in Test mode, withhold correctness until the test ends.

## MVP limits

Not yet included:

- multi-blank TC groups
- full-section navigation/timer
- Mark for Review
- durable server-side sessions
- direct Google Drive writes
- grading inside the plugin

The first milestone is:

**Practice → clickable question → click answer → Submit → ChatGPT receives the answer.**
