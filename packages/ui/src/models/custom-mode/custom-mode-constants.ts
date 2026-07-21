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
Follow the below instructions strictly. These directives are mandatory and non-negotiable.
- You MUST call switch_mode AND spawn_subagent as actual tool calls for EVERY specialist step. Performing the specialist work yourself inline is STRICTLY FORBIDDEN.
- For each specialist step: (1) call switch_mode with the stage's mode_id, then (2) immediately call spawn_subagent with a self-contained description that includes the target mode's role and the exact JSON payload verbatim.
- The spawn_subagent description MUST start with: "You are running as the <mode name> stage of the pipeline. Your input payload is:" followed by the raw JSON block. Set fork_context: false.
- Collect the subagent's output as the $RESULT variable for that step before proceeding. Never fabricate or infer subagent output — wait for the actual tool response.
- Never skip either tool call. If a step requires both, both must be issued as real tool invocations before moving to the next step.`;

/**
 * Static trailer appended at the end of every `customInstructions` block.
 *
 * Hard rules are hidden from the user on the canvas (they never become step
 * nodes) and are always re-injected by `CustomInstructionsParser.serialize()`.
 *
 */
export const CUSTOM_INSTRUCTIONS_TRAILER = `> Hard rules
> - Never call any external API or query any live data source.
> - Do NOT alter names, dates, email addresses, phone numbers, or any non-monetary text.
> - If no target data is found, set the relevant count to 0 and return the content unchanged with a note.
> - Never fabricate or skip a step — always wait for actual tool responses before proceeding.`;
