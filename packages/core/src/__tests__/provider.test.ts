import { describe, expect, it, vi } from "vitest";
import { chatWithTools, type AgentMessage, type LLMClient, type ToolDefinition } from "../llm/provider.js";

const DEFAULTS = {
  temperature: 0.7,
  maxTokens: 1024,
  thinkingBudget: 0,
} as const;

const TOOL: ToolDefinition = {
  name: "write_draft",
  description: "Write a chapter draft",
  parameters: {
    type: "object",
    properties: {
      bookId: { type: "string" },
    },
    required: ["bookId"],
  },
};

const MESSAGES: ReadonlyArray<AgentMessage> = [
  { role: "system", content: "你是一个助手" },
  { role: "user", content: "帮我写第一章" },
];

function emptyAsyncIterable<T>(): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      return;
    },
  };
}

describe("chatWithTools", () => {
  it("falls back to non-streaming chat completions when streaming yields no tool calls", async () => {
    const create = vi.fn()
      .mockResolvedValueOnce(emptyAsyncIterable())
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: {
                    name: "write_draft",
                    arguments: JSON.stringify({ bookId: "book-1" }),
                  },
                },
              ],
            },
          },
        ],
      });

    const client = {
      provider: "openai",
      apiFormat: "chat",
      _openai: {
        chat: {
          completions: { create },
        },
      },
      defaults: DEFAULTS,
    } as unknown as LLMClient;

    const result = await chatWithTools(client, "gpt-4o", MESSAGES, [TOOL]);

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({ stream: true }));
    expect(create).toHaveBeenNthCalledWith(2, expect.objectContaining({ stream: false }));
    expect(result).toEqual({
      content: "",
      toolCalls: [
        {
          id: "call_1",
          name: "write_draft",
          arguments: JSON.stringify({ bookId: "book-1" }),
        },
      ],
    });
  });

  it("falls back to non-streaming responses API when streaming yields no output", async () => {
    const create = vi.fn()
      .mockResolvedValueOnce(emptyAsyncIterable())
      .mockResolvedValueOnce({
        output_text: "马上处理",
        output: [
          {
            type: "function_call",
            call_id: "call_2",
            name: "write_draft",
            arguments: JSON.stringify({ bookId: "book-2" }),
          },
        ],
      });

    const client = {
      provider: "openai",
      apiFormat: "responses",
      _openai: {
        responses: { create },
      },
      defaults: DEFAULTS,
    } as unknown as LLMClient;

    const result = await chatWithTools(client, "gpt-4.1", MESSAGES, [TOOL]);

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({ stream: true }));
    expect(create).toHaveBeenNthCalledWith(2, expect.objectContaining({ stream: false }));
    expect(result).toEqual({
      content: "马上处理",
      toolCalls: [
        {
          id: "call_2",
          name: "write_draft",
          arguments: JSON.stringify({ bookId: "book-2" }),
        },
      ],
    });
  });
});
