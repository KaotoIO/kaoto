// kaoto/packages/ui/src/models/custom-mode/custom-mode-types.ts

/** A single tool permission group entry. Either a plain string (e.g. "read") or
 *  a tuple of [groupName, constraint] (e.g. ["edit", { fileRegex: "(\\.yaml$)" }]). */
export type CustomModeGroup = string | [string, { fileRegex: string }];

/** One mode definition — mirrors the YAML schema exactly. */
export interface CustomMode {
  slug: string;
  name: string;
  description: string;
  roleDefinition: string;
  whenToUse: string;
  customInstructions?: string;
  groups: CustomModeGroup[];
}

/** The top-level structure of a custom_modes.yaml file. */
export interface CustomModeFile {
  customModes: CustomMode[];
}

// ---------------------------------------------------------------------------
// customInstructions parsed types
// ---------------------------------------------------------------------------

/**
 * Represents a single parsed instruction step from a customInstructions block.
 *
 * nodeType is always 'step' for now — it represents one numbered list item
 * (e.g. "1. Parse the draft", "2. Write Role Summary").
 *
 * TODO: Epic 7 — decide whether additional nodeType values are needed (e.g.
 * 'tool-call', 'decision') once the canvas node catalogue is finalised.
 */
export interface CustomInstructionsNode {
  /** Discriminator for the canvas node type. Currently always 'step'. */
  nodeType: string;
  /** The full markdown text of the list item (title paragraph + sub-bullets). */
  rawContent: string;
  /** Plain-text title extracted from the first paragraph of the list item. */
  title: string;
  /** 1-based position of this step in the ordered list. */
  index: number;
}

/**
 * The structured result of parsing a full customInstructions block.
 *
 * Tables, blockquotes ("Hard rules"), and any other unstructured content are
 * NOT extracted — they remain in the raw customInstructions string and are
 * round-tripped verbatim by serialize().
 */
export interface ParsedCustomInstructions {
  /** Ordered instruction steps — one per numbered list item. */
  steps: CustomInstructionsNode[];
}
