import { PgAssistant } from "../store";
import {
  describeCatalog,
  loadReference,
  loadSkill,
  requireSkill,
} from "../grounding";
import type { ToolDefinition, ToolInput } from "./types";

/** Read a required string argument the model supplied */
const str = (input: ToolInput, key: string) => {
  const value = input[key];
  return typeof value === "string" ? value : "";
};

/** Turn a thrown fetch or lookup failure into something the model can act on */
const explain = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Ecosystem knowledge, loaded on demand.
 *
 * Progressive disclosure: only the catalogue sits in the prompt, and a skill's
 * body arrives as a tool result when the model decides it needs it. All three
 * are reads, so none of them asks the user for anything.
 *
 * @returns vendor-neutral tool definitions, so every provider gets them
 */
export const createSkillTools = (): ToolDefinition[] => [
  {
    name: "list_skills",
    description:
      "List the reference skills available to load, with what each covers. " +
      "Call this when a question touches Solana frameworks, versions, " +
      "security, testing or this environment's limits, and you have not " +
      "loaded a skill yet this conversation.",
    schema: { type: "object", properties: {}, additionalProperties: false },
    run: () => {
      PgAssistant.addToolCall("listed the skills");
      return describeCatalog(PgAssistant.enabledSkillIds);
    },
  },

  {
    name: "load_skill",
    description:
      "Read a skill's main document. Load playground-env before proposing " +
      "any code, since it states which crate versions actually compile here. " +
      "The document names its own reference files; read those with " +
      "read_skill_reference rather than guessing at their contents.",
    schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Skill id from list_skills, e.g. playground-env",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    run: async (input) => {
      const id = str(input, "id");
      try {
        const skill = requireSkill(id);
        PgAssistant.addToolCall(`loaded the ${skill.name} skill`);
        return await loadSkill(skill);
      } catch (e) {
        return `Could not load ${id}: ${explain(e)}`;
      }
    },
  },

  {
    name: "read_skill_reference",
    description:
      "Read one reference file belonging to a skill, using a path the " +
      "skill's own document gave you. Paths are relative to the skill " +
      "folder, e.g. references/common-errors.md.",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Skill id, e.g. solana-dev" },
        path: {
          type: "string",
          description:
            "Path relative to the skill folder, e.g. references/security.md",
        },
      },
      required: ["id", "path"],
      additionalProperties: false,
    },
    run: async (input) => {
      const id = str(input, "id");
      const path = str(input, "path");
      try {
        const skill = requireSkill(id);
        PgAssistant.addToolCall(`read ${skill.id}/${path}`);
        return await loadReference(skill, path);
      } catch (e) {
        return `Could not read ${path} from ${id}: ${explain(e)}`;
      }
    },
  },
];
