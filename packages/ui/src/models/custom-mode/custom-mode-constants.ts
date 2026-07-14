/**
 * Static preamble injected at the top of every `customInstructions` block.
 *
 * All Bob custom modes share this identical header — it tells the LLM how to
 * interpret `**switch_mode**` and `**spawn_subagent**` markers that appear in
 * the numbered steps.
 *
 * Kaoto hides this text on the canvas (it never becomes a step node) and
 * re-injects it whenever `customInstructions` is serialised back to YAML.
 *
 * Kept here — not in `CustomInstructionsParser` — so that the template file
 * (`custom-mode.ts`) and any future consumers can import a plain string constant
 * without pulling in the full mdast-based parser dependency.
 */
export const CUSTOM_INSTRUCTIONS_PREAMBLE = `system instructions:
follow the below instructions strictly.
 **switch_mode** -- if you see this. switch to the desired mode and proceed to spawn a subagent
 **spawn_subagent** -- if you see this. spawn a subagent.`;

/**
 * Static trailer appended at the end of every `customInstructions` block.
 *
 * Hard rules are hidden from the user on the canvas (they never become step
 * nodes) and are always re-injected by `CustomInstructionsParser.serialize()`.
 *
 * TODO: consolidate the per-mode rule sets into a single canonical list.
 */
export const CUSTOM_INSTRUCTIONS_TRAILER = `> Hard rules
> - Do not invent content not present in the input.
> - Follow the output format specified in the final step exactly.`;
