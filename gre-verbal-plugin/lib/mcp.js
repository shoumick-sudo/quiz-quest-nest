import { readFileSync } from "node:fs";
import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerQuestionTools } from "./tools-question.js";
import { registerSectionTools } from "./tools-section.js";
import { registerMasteryTools } from "./tools-mastery.js";
import { registerLearningTools } from "./tools-learning.js";

export const TEST_URI = "ui://gre-verbal/test-engine-v6.html";
export const DASHBOARD_URI = "ui://gre-verbal/mastery-dashboard-v4.html";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function buildTestWidget() {
  const css = read("../public/gre-test-engine.css");
  const js = [
    read("../public/ui-state.js"),
    read("../public/ui-render.js"),
    read("../public/ui-actions.js")
  ].join("\n");
  return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>" +
    css + "</style></head><body><main id=\"app\" class=\"shell\"><div class=\"loading\">Loading GRE Verbal engine…</div></main><script type=\"module\">" +
    js + "</script></body></html>";
}

function buildDashboardWidget() {
  const css = read("../public/dashboard.css");
  const js = read("../public/dashboard.js");
  return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>" +
    css + "</style></head><body><main id=\"app\"></main><script type=\"module\">" +
    js + "</script></body></html>";
}

export function createGreMcp() {
  const server = new McpServer({
    name: "gre-verbal-clickable-quiz",
    version: "0.5.1"
  });

  registerAppResource(server, "gre-test-engine-v6", TEST_URI, {}, async () => ({
    contents: [{
      uri: TEST_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: buildTestWidget(),
      _meta: {
        ui: { prefersBorder: true },
        "openai/widgetPrefersBorder": true,
        "openai/widgetDescription":
          "GRE Verbal practice and test engine with clickable answers, learner reasoning notes, immediate Practice-mode answer reveal, timed sections, recovery, and mastery handoff."
      }
    }]
  }));

  registerAppResource(server, "gre-mastery-dashboard-v4", DASHBOARD_URI, {}, async () => ({
    contents: [{
      uri: DASHBOARD_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: buildDashboardWidget(),
      _meta: {
        ui: { prefersBorder: true },
        "openai/widgetDescription":
          "GRE Verbal mastery dashboard showing source-of-truth snapshot cache, evidence trends, review-due targets, vocabulary, recurring errors, recent sessions, and next priorities."
      }
    }]
  }));

  registerQuestionTools(server, TEST_URI);
  registerSectionTools(server, TEST_URI);
  registerMasteryTools(server);
  registerLearningTools(server, DASHBOARD_URI);
  return server;
}
