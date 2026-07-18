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
 * `nodeType` is either:
 *  - `'step'`            — an ordinary numbered instruction (default)
 *  - `'tool-invocation'` — the list-item title is exactly `**toolName**`,
 *                          meaning the step represents a direct tool call.
 *                          The resolved tool name is stored in `toolName`.
 */
export interface CustomInstructionsNode {
  /**
   * Discriminator for the canvas node type.
   * - `'step'`            — ordinary instruction step
   * - `'tool-invocation'` — direct tool call (title is `**toolName**`)
   */
  nodeType: 'step' | 'tool-invocation';
  /**
   * Origin of this node — used by serialize() to decide whether to wrap it
   * inside a numbered list item or emit it as top-level markdown.
   * - `'list-item'`  — came from an ordered-list item; serialize as `N. …`
   * - `'free-form'`  — came from headings/prose/tables outside any list;
   *                    serialize as top-level markdown (no list marker)
   *
   * Defaults to `'list-item'` when absent so that nodes created by older
   * code or tests that don't set the field are serialized as before.
   */
  source?: 'list-item' | 'free-form';
  /** The full markdown text of the list item (title paragraph + sub-bullets). */
  rawContent: string;
  /** Plain-text title extracted from the first paragraph of the list item. */
  title: string;
  /** 1-based position of this step in the ordered list. */
  index: number;
  /**
   * The tool name extracted from the `**toolName**` title pattern.
   * Only present when `nodeType === 'tool-invocation'`.
   */
  toolName?: string;
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
