import { readFileSync } from "node:fs";
import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerQuestionTools } from "./tools-question.js";
import { registerSectionTools } from "./tools-section.js";

export const TEMPLATE_URI = "ui://gre-verbal/test-engine-v2.html";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function buildWidget() {
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

export function createGreMcp() {
  const server = new McpServer({ name: "gre-verbal-clickable-quiz", version: "0.2.0" });
  const widgetHtml = buildWidget();

  registerAppResource(server, "gre-test-engine-v2", TEMPLATE_URI, {}, async () => ({
    contents: [{
      uri: TEMPLATE_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: widgetHtml,
      _meta: {
        ui: { prefersBorder: true },
        "openai/widgetDescription": "GRE Verbal practice and test engine with timing, navigation, review flags, TC, SE, RC, and select-in-passage."
      }
    }]
  }));

  registerQuestionTools(server, TEMPLATE_URI);
  registerSectionTools(server, TEMPLATE_URI);
  return server;
}
