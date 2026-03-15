import { beforeEach, describe, expect, it, vi } from "vitest";

const { chatWithTools } = vi.hoisted(() => ({
  chatWithTools: vi.fn(),
}));

vi.mock("../llm/provider.js", () => ({
  chatWithTools,
}));

vi.mock("../pipeline/runner.js", () => ({
  PipelineRunner: class PipelineRunner {},
}));

vi.mock("../state/manager.js", () => ({
  StateManager: class StateManager {},
}));

import { runAgentLoop } from "../pipeline/agent.js";

describe("runAgentLoop", () => {
  beforeEach(() => {
    chatWithTools.mockReset();
  });

  it("throws a clear error when the provider returns an empty result", async () => {
    chatWithTools.mockResolvedValue({
      content: "",
      toolCalls: [],
    });

    await expect(
      runAgentLoop(
        {
          client: {
            provider: "openai",
            apiFormat: "chat",
            defaults: {
              temperature: 0.7,
              maxTokens: 1024,
              thinkingBudget: 0,
            },
          } as never,
          model: "gpt-4o",
          projectRoot: "/tmp/inkos-test",
        },
        "列出所有书",
      ),
    ).rejects.toThrow(/empty response/i);
  });
});
