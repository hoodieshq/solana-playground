import { createTools } from "./tools";
import { realBridge } from "../bridge/playground-bridge";
import { PgAssistant } from "../store";
import type { Provider, ToolDefinition, ToolInput } from "./types";

/** Rough typing speed, so streaming looks like streaming */
const CHARS_PER_TICK = 3;
const TICK_MS = 12;

/** Integer types a string literal is commonly mis-assigned to */
const INT_TYPE = /\b([ui](?:8|16|32|64|128|size))\b/;

/**
 * A canned walkthrough of the build-error path.
 *
 * The reasoning is scripted; **everything else is real**. It calls the same
 * tools as a live model, so reading the build output, the proposed diff, the
 * approval gate, writing the file and the build itself all genuinely happen.
 * That makes it useful for demoing without an API account, and honest — the
 * panel says which provider is active.
 *
 * It is not a model: it can only handle the cases written into it, and says so
 * when it meets anything else.
 */
export const createScriptedProvider = (): Provider => {
  const tools = createTools();
  const call = (name: string, input: ToolInput = {}) => {
    const tool = tools.find((t: ToolDefinition) => t.name === name);
    if (!tool) throw new Error(`No tool named ${name}`);
    return Promise.resolve(tool.run(input));
  };

  const stream = async (text: string, signal?: AbortSignal) => {
    const id = PgAssistant.startAssistantMessage();
    for (let i = 0; i < text.length; i += CHARS_PER_TICK) {
      signal?.throwIfAborted();
      PgAssistant.appendToAssistantMessage(
        id,
        text.slice(i, i + CHARS_PER_TICK)
      );
      await new Promise((r) => setTimeout(r, TICK_MS));
    }
  };

  return {
    id: "scripted",
    label: "scripted demo — no model is running",

    async send(input, signal) {
      const say = (text: string) => stream(text, signal);
      const asked = input.toLowerCase();

      if (/roadmap|status|plan|building|what is this|why.*exist/.test(asked)) {
        await say(
          "This is Solana Playground with an assistant built into it. The " +
            "roadmap, the decisions behind it and where the work stands are " +
            "on the **What we're building** tab — that tab and my context are " +
            "the same document, so they cannot drift apart.\n\n" +
            "Right now: the panel, the project bridge and the build-output " +
            "capture are done. The live model call is the part still being " +
            "wired.\n\n" +
            "_You are talking to the scripted demo, not a model._"
        );
        return;
      }

      if (!/build|error|fail|fix|wrong|broken|compile/.test(asked)) {
        await say(
          "The scripted demo only walks the build-error path. Ask me why the " +
            "build failed, or about the roadmap — anything else needs a real " +
            "provider, which you can pick from the connect screen."
        );
        return;
      }

      // --- the build-error walkthrough, using the real tools ---
      await say("Let me look at what the compiler actually said.");

      const buildOutput = await call("get_build_error");
      if (buildOutput.startsWith("The last build did not fail")) {
        await say(
          "Nothing has failed to build yet this session. Run `build` in the " +
            "terminal first — I read the compiler's real output, so I need a " +
            "real failure to explain."
        );
        return;
      }

      const firstError =
        buildOutput.split("\n").find((line) => line.startsWith("error")) ??
        "the compiler reported an error";
      const location = buildOutput.match(/-->\s*(\S+)/)?.[1] ?? null;

      const { currentFilePath } = realBridge.getProjectContext();
      const path = location?.split(":")[0] ?? currentFilePath;
      if (!path) {
        await say(`${firstError}\n\nI could not tell which file that is in.`);
        return;
      }

      const content = await call("read_file", { path });

      await say(
        `\`${firstError}\`\n\n` +
          (location ? `It is at \`${location}\`. ` : "") +
          "Here is what that means in your code."
      );

      const fixed = fixStringAssignedToInteger(content);
      if (!fixed) {
        await say(
          "This one I cannot fix from a script — the scripted demo only knows " +
            "how to repair a string literal assigned to an integer type. " +
            "Connect a real provider and I will work it out properly."
        );
        return;
      }

      await say(
        `Line \`${fixed.line.trim()}\` assigns a string to \`${
          fixed.type
        }\`. ` +
          `Rust will not convert that for you, so the value has to be a ` +
          `number. Starting it at \`0\` matches how it is used.`
      );

      // Real write, real diff, real approval gate
      await call("write_file", { path, content: fixed.content });
    },
  };
};

/**
 * Repair the one mistake this script knows: a string literal assigned to an
 * integer type, which is the `E0308` case in the demo fixture.
 *
 * @param content the file as it is now
 * @returns the corrected file, or `null` if the pattern is not present
 */
const fixStringAssignedToInteger = (content: string) => {
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const type = line.match(INT_TYPE)?.[1];
    // A string literal on the right of an assignment to an integer type
    if (!type || !/=\s*"[^"]*"\s*;/.test(line)) continue;

    lines[i] = line.replace(/=\s*"[^"]*"\s*;/, "= 0;");
    return { content: lines.join("\n"), line, type };
  }

  return null;
};
