import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

import { loadConfig } from "../utils.js";

describe("loadConfig", () => {
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let tempDir: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    tempDir = await mkdtemp(join(tmpdir(), "inkos-cli-utils-"));
    process.chdir(tempDir);

    await writeFile(
      join(tempDir, "inkos.json"),
      JSON.stringify({
        name: "test-project",
        version: "0.1.0",
        llm: {
          provider: "openai",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o",
        },
        notify: [],
      }),
      "utf-8",
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("surfaces provider config errors instead of pretending inkos.json is missing", async () => {
    process.env = {
      ...originalEnv,
      INKOS_LLM_PROVIDER: "mistral",
      INKOS_LLM_API_KEY: "sk-test",
    };

    await expect(loadConfig()).rejects.toThrow(/provider|llm config|enum/i);
    await expect(loadConfig()).rejects.not.toThrow(/inkos\.json not found/i);
  });
});
