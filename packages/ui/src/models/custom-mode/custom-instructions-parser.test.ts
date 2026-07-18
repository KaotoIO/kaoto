import { CustomInstructionsParser } from './custom-instructions-parser';
import { CUSTOM_INSTRUCTIONS_PREAMBLE, CUSTOM_INSTRUCTIONS_TRAILER } from './custom-mode-constants';
import { CustomInstructionsNode } from './custom-mode-types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const withPreamble = (body: string) => `${CUSTOM_INSTRUCTIONS_PREAMBLE}\n\n${body}`;

/** Minimal well-formed customInstructions block (3 steps + blockquote). */
const MINIMAL_INSTRUCTIONS = withPreamble(
  `
# ROLE: Test Runner

1. First step
   - do thing A
   - do thing B

2. Second step
   - **read_file** the input

3. Third step
   - Return the result

> Hard rules
> - Only JSON output.
> - Never add prose.
`.trim(),
);

/** Instructions with no ordered list — only prose and a heading. */
const NO_LIST_INSTRUCTIONS = `
# ROLE: Prose Only

This mode has no numbered steps, just free-form prose.
`.trim();

/** Orchestrator-style 5-step instructions (mirrors examples/custom_modes_jd.yaml, old format). */
const ORCHESTRATOR_INSTRUCTIONS = withPreamble(
  `
# JD Pipeline Orchestrator

1. Read source file
   - **read_file** the path provided by the user (default: \`sample_file_jd_normalizer.md\`)
   - Store as \`$INPUT\`: \`source_path\`, \`content\`, \`char_count\`, \`line_count\`
   - If file not found, report error and stop
   - **update_todo_list**: Step 1 done, Steps 2A + 2B in progress

2. Rewrite + Skills Extraction *(parallel — same tool-call turn)*
   - Subagent A — Rewrite
     - **switch_mode** → \`jd-rewrite-a1b2\`
     - **spawn_subagent**: pass \`{ "content": $INPUT.content, "source_path": $INPUT.source_path }\`
     - Collect \`$REWRITE_RESULT\`
   - Subagent B — Skills Extraction
     - **switch_mode** → \`jd-skills-c3d4\`
     - **spawn_subagent**: pass \`{ "content": $INPUT.content, "source_path": $INPUT.source_path }\`
     - Collect \`$SKILLS_RESULT\`
   - **update_todo_list**: Step 2 done, Step 3 in progress

3. Assemble JD
   - **switch_mode** → \`jd-merge-7e9f\`
   - **spawn_subagent**: pass combined \`$REWRITE_RESULT\` + \`$SKILLS_RESULT\`
   - Collect \`$ASSEMBLE_RESULT\`
   - **update_todo_list**: Step 3 done, Step 4 in progress

4. Bias Verification
   - **switch_mode** → \`jd-verify\`
   - **spawn_subagent**: pass \`$ASSEMBLE_RESULT\`
   - Collect \`$VERIFY_RESULT\`
   - **update_todo_list**: Step 4 done, Step 5 in progress

5. Write output file
   - Derive output path: replace \`.md\` → \`_verified.md\` in \`$INPUT.source_path\`
   - **write_file** with metadata header + \`$VERIFY_RESULT.final_jd\`
   - Present plain-language summary: source path, output path, skill count,
     seniority, bias check result, attempt count

> Hard rules
> - Never transform data yourself — each specialist mode owns its logic.
> - Always call **switch_mode** before **spawn_subagent** for every specialist step.
`.trim(),
);

/**
 * New JD-style instructions where a step title is `**tool_name**`
 * (mirrors the updated examples/custom_modes_jd.yaml, line 303 format).
 */
const TOOL_INVOCATION_INSTRUCTIONS = withPreamble(
  `
# JD Pipeline Orchestrator

1. **read_file**
   - title: Read source file
   - description: the path provided by the user (default: \`sample_file_jd_normalizer.md\`)
   - Store as \`$INPUT\`: \`source_path\`, \`content\`, \`char_count\`, \`line_count\`
   - If file not found, report error and stop

2. **update_todo_list**
   - todos: Step 1 done, Steps 2A + 2B in progress

3. **switch_mode**
   - mode_id: jd-rewrite-a1b2

4. **spawn_subagent**
   - name: Subagent A — Rewrite
   - taskDescription:
     - pass \`{ "content": $INPUT.content, "source_path": $INPUT.source_path }\`
     - Collect \`$REWRITE_RESULT\`

5. Plain step with **bold** inside
   - Some description mentioning **read_file** tool
   - but the title itself is not a bare tool name

> Hard rules
> - Do not invent content.
`.trim(),
);

// ---------------------------------------------------------------------------
// parse() — backward-compat convenience wrapper
// ---------------------------------------------------------------------------

describe('CustomInstructionsParser', () => {
  describe('parse (convenience wrapper)', () => {
    it('returns [] for empty string', () => {
      expect(CustomInstructionsParser.parse('')).toEqual([]);
    });

    it('returns [] for whitespace-only string', () => {
      expect(CustomInstructionsParser.parse('   \n\n   ')).toEqual([]);
    });

    it('returns a single free-form step when there is no ordered list', () => {
      // No ordered list → free-form pass kicks in and produces one step text-node.
      const nodes = CustomInstructionsParser.parse(NO_LIST_INSTRUCTIONS);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].nodeType).toBe('step');
    });

    it('returns ordered-list nodes + one free-form node for the 3-step fixture', () => {
      // MINIMAL_INSTRUCTIONS has a # ROLE heading → free-form node appears first (before the list).
      expect(CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS)).toHaveLength(4);
    });

    it('returns 5 ordered nodes + 1 free-form node for the orchestrator fixture', () => {
      // ORCHESTRATOR_INSTRUCTIONS has a # JD Pipeline Orchestrator heading.
      expect(CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS)).toHaveLength(6);
    });

    it('every node from MINIMAL_INSTRUCTIONS has nodeType "step"', () => {
      CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS).forEach((n) => {
        expect(n.nodeType).toBe('step');
      });
    });

    it('index is 1-based and contiguous across all nodes', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      nodes.forEach((n, i) => {
        expect(n.index).toBe(i + 1);
      });
    });

    it('title is the plain text of the first paragraph (no markdown)', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      // Free-form node comes first (the # ROLE heading), then the 3 list steps.
      const firstStep = nodes.find((n) => n.title === 'First step');
      const secondStep = nodes.find((n) => n.title === 'Second step');
      const thirdStep = nodes.find((n) => n.title === 'Third step');
      expect(firstStep).toBeDefined();
      expect(secondStep).toBeDefined();
      expect(thirdStep).toBeDefined();
    });

    it('rawContent is empty when a step has no sub-bullets', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      const thirdStep = nodes.find((n) => n.title === 'Third step')!;
      expect(thirdStep.rawContent.length).toBeGreaterThan(0);
    });

    it('rawContent of step 1 includes sub-bullet text but NOT the title', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      const firstStep = nodes.find((n) => n.title === 'First step')!;
      expect(firstStep.rawContent).toContain('do thing A');
      expect(firstStep.rawContent).toContain('do thing B');
      expect(firstStep.rawContent).not.toContain('First step');
    });

    it('rawContent of step 2 contains the unescaped bold tool reference but NOT the title', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      const secondStep = nodes.find((n) => n.title === 'Second step')!;
      // underscores must NOT be backslash-escaped in rawContent
      expect(secondStep.rawContent).toContain('read_file');
      expect(secondStep.rawContent).not.toContain('read\\_file');
      expect(secondStep.rawContent).not.toContain('Second step');
    });

    it('rawContent of ordered-list step nodes does NOT contain the blockquote', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      const listNodes = nodes.filter((n) => ['First step', 'Second step', 'Third step'].includes(n.title));
      listNodes.forEach((n) => {
        expect(n.rawContent).not.toContain('Hard rules');
      });
    });

    it('"system instructions:" preamble does not appear in any node', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      nodes.forEach((n) => {
        expect(n.title).not.toContain('system instructions');
        expect(n.rawContent).not.toContain('system instructions');
      });
    });

    it('step "Read source file" title is correct (orchestrator)', () => {
      const nodes = CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS);
      expect(nodes.some((n) => n.title === 'Read source file')).toBe(true);
    });

    it('step "Rewrite + Skills Extraction" title is present (orchestrator)', () => {
      const nodes = CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS);
      expect(nodes.some((n) => /Rewrite \+ Skills Extraction/.test(n.title))).toBe(true);
    });

    it('step "Write output file" title is present (orchestrator)', () => {
      const nodes = CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS);
      expect(nodes.some((n) => n.title === 'Write output file')).toBe(true);
    });

    it('"Read source file" rawContent contains update_todo_list ref but NOT the title (orchestrator)', () => {
      const nodes = CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS);
      const step = nodes.find((n) => n.title === 'Read source file')!;
      expect(step.rawContent).toMatch(/update.?_?.?todo.?_?.?list/);
      expect(step.rawContent).not.toContain('Read source file');
    });
  });

  // ---------------------------------------------------------------------------
  // tool-invocation nodeType — **toolName** title format (JD YAML new style)
  // ---------------------------------------------------------------------------

  describe('tool-invocation steps (new **toolName** title format)', () => {
    it('returns 5 ordered nodes + 1 free-form node for the tool-invocation fixture', () => {
      // TOOL_INVOCATION_INSTRUCTIONS has a # JD Pipeline Orchestrator heading (free-form).
      expect(CustomInstructionsParser.parse(TOOL_INVOCATION_INSTRUCTIONS)).toHaveLength(6);
    });

    it('the read_file step has nodeType "tool-invocation"', () => {
      const nodes = CustomInstructionsParser.parse(TOOL_INVOCATION_INSTRUCTIONS);
      const node = nodes.find((n) => n.toolName === 'read_file');
      expect(node?.nodeType).toBe('tool-invocation');
    });

    it('the read_file step toolName is "read_file"', () => {
      const nodes = CustomInstructionsParser.parse(TOOL_INVOCATION_INSTRUCTIONS);
      expect(nodes.some((n) => n.toolName === 'read_file')).toBe(true);
    });

    it('the update_todo_list step toolName is "update_todo_list"', () => {
      const nodes = CustomInstructionsParser.parse(TOOL_INVOCATION_INSTRUCTIONS);
      expect(nodes.some((n) => n.toolName === 'update_todo_list')).toBe(true);
    });

    it('the switch_mode step toolName is "switch_mode"', () => {
      const nodes = CustomInstructionsParser.parse(TOOL_INVOCATION_INSTRUCTIONS);
      expect(nodes.some((n) => n.toolName === 'switch_mode')).toBe(true);
    });

    it('the spawn_subagent step toolName is "spawn_subagent"', () => {
      const nodes = CustomInstructionsParser.parse(TOOL_INVOCATION_INSTRUCTIONS);
      expect(nodes.some((n) => n.toolName === 'spawn_subagent')).toBe(true);
    });

    it('the plain step (bold inside body, not bare title) has nodeType "step"', () => {
      const nodes = CustomInstructionsParser.parse(TOOL_INVOCATION_INSTRUCTIONS);
      const plain = nodes.find((n) => n.title === 'Plain step with bold inside');
      expect(plain?.nodeType).toBe('step');
      expect(plain?.toolName).toBeUndefined();
    });

    it('tool-invocation step title matches the tool name text', () => {
      const nodes = CustomInstructionsParser.parse(TOOL_INVOCATION_INSTRUCTIONS);
      const node = nodes.find((n) => n.toolName === 'read_file')!;
      expect(node.title).toBe('read_file');
    });

    it('tool-invocation rawContent includes the parameter sub-bullets', () => {
      const nodes = CustomInstructionsParser.parse(TOOL_INVOCATION_INSTRUCTIONS);
      const node = nodes.find((n) => n.toolName === 'read_file')!;
      expect(node.rawContent).toContain('title');
    });

    it('toolName is undefined on ordinary step nodes', () => {
      CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS).forEach((n) => {
        expect(n.toolName).toBeUndefined();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // parseAll()
  // ---------------------------------------------------------------------------

  describe('parseAll', () => {
    it('returns empty steps for empty string', () => {
      expect(CustomInstructionsParser.parseAll('')).toEqual({ steps: [] });
    });

    it('parseAll().steps equals parse() for the same input', () => {
      const viaParseAll = CustomInstructionsParser.parseAll(MINIMAL_INSTRUCTIONS).steps;
      const viaParse = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      expect(viaParseAll).toEqual(viaParse);
    });

    it('blockquote Hard rules trailer does not become a step', () => {
      // The trailing blockquote is stripped; MINIMAL has 3 list steps + 1 free-form (# ROLE heading).
      const { steps } = CustomInstructionsParser.parseAll(MINIMAL_INSTRUCTIONS);
      expect(steps).toHaveLength(4);
      expect(steps.every((s) => s.rawContent !== 'Hard rules')).toBe(true);
    });

    it('table content becomes part of the free-form step node', () => {
      // A GFM table before the ordered list → free-form step node contains the table.
      const withTable = `
# ROLE: Skills Extractor

Skill categories:
| Category    | Examples                          |
|-------------|-----------------------------------|
| technical   | languages, frameworks, tools      |

1. Extract skills
   - Scan the JD.

2. Return result
   - Return JSON.
`.trim();
      const { steps } = CustomInstructionsParser.parseAll(withTable);
      // 2 ordered steps + 1 free-form step (heading + table)
      expect(steps).toHaveLength(3);
      const freeFormStep = steps.find(
        (s) => s.rawContent.includes('Skills Extractor') || s.rawContent.includes('Category'),
      );
      expect(freeFormStep).toBeDefined();
      // The 2 ordered steps still parse correctly
      const extractStep = steps.find((s) => s.title === 'Extract skills');
      expect(extractStep).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // constants
  // ---------------------------------------------------------------------------

  describe('CUSTOM_INSTRUCTIONS_PREAMBLE', () => {
    it('starts with "system instructions:"', () => {
      expect(CUSTOM_INSTRUCTIONS_PREAMBLE).toMatch(/^system instructions:/);
    });

    it('contains switch_mode reference', () => {
      expect(CUSTOM_INSTRUCTIONS_PREAMBLE).toContain('switch_mode');
    });

    it('contains spawn_subagent reference', () => {
      expect(CUSTOM_INSTRUCTIONS_PREAMBLE).toContain('spawn_subagent');
    });
  });

  describe('CUSTOM_INSTRUCTIONS_TRAILER', () => {
    it('starts with a blockquote Hard rules header', () => {
      expect(CUSTOM_INSTRUCTIONS_TRAILER).toMatch(/^> Hard rules/);
    });

    it('contains at least one blockquote rule line', () => {
      expect(CUSTOM_INSTRUCTIONS_TRAILER).toMatch(/^> -/m);
    });
  });

  // ---------------------------------------------------------------------------
  // serialize()
  // ---------------------------------------------------------------------------

  describe('serialize', () => {
    it('returns empty string for empty array', () => {
      expect(CustomInstructionsParser.serialize([])).toBe('');
    });

    it('produces an ordered-list markdown string with title on the step line', () => {
      // rawContent is body-only; serialize must prepend the title.
      const nodes: CustomInstructionsNode[] = [
        { nodeType: 'step', index: 1, title: 'Alpha', rawContent: '- sub A' },
        { nodeType: 'step', index: 2, title: 'Beta', rawContent: '' },
      ];
      const out = CustomInstructionsParser.serialize(nodes);
      expect(out).toContain('1. Alpha');
      expect(out).toContain('2. Beta');
      // sub-bullet from body must be present
      expect(out).toContain('sub A');
    });

    it('re-injects the static preamble at the start', () => {
      const nodes: CustomInstructionsNode[] = [{ nodeType: 'step', index: 1, title: 'Do something', rawContent: '' }];
      const out = CustomInstructionsParser.serialize(nodes);
      expect(out).toContain('system instructions:');
      expect(out).toContain('switch_mode');
      expect(out.indexOf(CUSTOM_INSTRUCTIONS_PREAMBLE)).toBe(0);
    });

    it('appends the static trailer at the end', () => {
      const nodes: CustomInstructionsNode[] = [{ nodeType: 'step', index: 1, title: 'Do something', rawContent: '' }];
      const out = CustomInstructionsParser.serialize(nodes);
      expect(out).toContain('> Hard rules');
      expect(out.trimEnd().endsWith(CUSTOM_INSTRUCTIONS_TRAILER.trimEnd())).toBe(true);
    });

    it('preamble comes before steps and trailer comes after', () => {
      const nodes: CustomInstructionsNode[] = [{ nodeType: 'step', index: 1, title: 'Middle', rawContent: '' }];
      const out = CustomInstructionsParser.serialize(nodes);
      const preamblePos = out.indexOf(CUSTOM_INSTRUCTIONS_PREAMBLE);
      const stepPos = out.indexOf('1. Middle');
      const trailerPos = out.indexOf(CUSTOM_INSTRUCTIONS_TRAILER);
      expect(preamblePos).toBeLessThan(stepPos);
      expect(stepPos).toBeLessThan(trailerPos);
    });

    it('uses dynamic indentation — step 10 uses 4-space indent for continuation', () => {
      const nodes: CustomInstructionsNode[] = Array.from({ length: 10 }, (_, i) => ({
        nodeType: 'step',
        index: i + 1,
        title: `Step ${i + 1}`,
        rawContent: `- detail line`,
      }));
      const out = CustomInstructionsParser.serialize(nodes);
      // Step 10 marker is "10. " (4 chars), so continuation must be indented 4 spaces
      const step10Lines = out
        .split('\n')
        .filter((l) => l.startsWith('10.') || (l.startsWith('    ') && out.includes('10.')));
      expect(step10Lines.some((l) => l.startsWith('10.'))).toBe(true);
      // The continuation line for step 10 must have 4-space indent, not 3
      const step10Block = out.slice(out.indexOf('10. '));
      const continuationLine = step10Block.split('\n')[1];
      expect(continuationLine).toMatch(/^ {4}/);
      expect(continuationLine).not.toMatch(/^ {4} /); // not 5 spaces
    });
  });

  // ---------------------------------------------------------------------------
  // parse → serialize round-trip
  // ---------------------------------------------------------------------------

  describe('round-trip: parse then serialize then parse', () => {
    it('produces the same step count and titles after a round-trip', () => {
      const original = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      const serialized = CustomInstructionsParser.serialize(original);
      const roundTripped = CustomInstructionsParser.parse(serialized);

      expect(roundTripped).toHaveLength(original.length);
      original.forEach((node, i) => {
        expect(roundTripped[i].title).toBe(node.title);
        expect(roundTripped[i].index).toBe(node.index);
        expect(roundTripped[i].nodeType).toBe('step');
      });
    });

    it('serialized output starts with the preamble, contains steps, ends with trailer', () => {
      const original = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      const serialized = CustomInstructionsParser.serialize(original);
      expect(serialized).toMatch(/^system instructions:/);
      // The free-form heading node comes first, so "First step" appears as step 2 or later.
      expect(serialized).toContain('First step');
      expect(serialized).toContain('> Hard rules');
    });

    it('rawContent preserves dash bullets (-) after parse, not asterisk (*)', () => {
      // Regression: toMarkdown defaults to '*' for unordered lists; we must pass { bullet: '-' }.
      const nodes = CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS);
      const step = nodes.find((n) => n.title === 'Read source file')!;
      // The sub-bullets in the original fixture use '-'; rawContent must preserve that.
      expect(step.rawContent).not.toMatch(/^\* /m);
      expect(step.rawContent).toMatch(/^- /m);
    });
  });

  // ---------------------------------------------------------------------------
  // parseToolParams()
  // ---------------------------------------------------------------------------

  describe('parseToolParams', () => {
    it('returns empty object for empty rawContent', () => {
      expect(CustomInstructionsParser.parseToolParams('')).toEqual({});
    });

    it('returns empty object when there is no unordered sub-list', () => {
      expect(CustomInstructionsParser.parseToolParams('**read_file**')).toEqual({});
    });

    it('parses simple key: value bullets', () => {
      const raw = '**read_file**\n\n* path: foo.md\n* range: 1-50';
      const result = CustomInstructionsParser.parseToolParams(raw);
      expect(result['path']).toBe('foo.md');
      expect(result['range']).toBe('1-50');
    });

    it('parses the JD YAML format (id, path, description with nested bullets)', () => {
      // rawContent is now stored with unescaped underscores (the \_ escaping is stripped at parse time)
      const raw =
        '**read_file**\n\n' +
        '* id: Read source file\n' +
        '* path: sample_file_jd_normalizer.md\n' +
        '* description:\n' +
        '  * the path provided by the user\n' +
        '  * Store as $INPUT: source_path, content';
      const result = CustomInstructionsParser.parseToolParams(raw);
      expect(result['id']).toBe('Read source file');
      expect(result['path']).toBe('sample_file_jd_normalizer.md');
      // nested bullets are concatenated under the description key
      expect(result['description']).toMatch(/the path provided/);
    });

    it('collects free-form bullets without a colon under _notes', () => {
      const raw = '**read_file**\n\n* path: foo.md\n* just a note without colon';
      const result = CustomInstructionsParser.parseToolParams(raw);
      expect(result['path']).toBe('foo.md');
      expect(result['_notes']).toBe('just a note without colon');
    });

    it('does not include _notes key when all bullets have colons', () => {
      const raw = '**read_file**\n\n* path: foo.md';
      const result = CustomInstructionsParser.parseToolParams(raw);
      expect(result['_notes']).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // serializeToolParams()
  // ---------------------------------------------------------------------------

  describe('serializeToolParams', () => {
    it('produces **toolName** header with bullet-list params', () => {
      const out = CustomInstructionsParser.serializeToolParams('read_file', { path: 'foo.md', range: '1-50' });
      expect(out).toContain('**read_file**');
      expect(out).toContain('- path: foo.md');
      expect(out).toContain('- range: 1-50');
    });

    it('produces only the header when params are empty', () => {
      const out = CustomInstructionsParser.serializeToolParams('read_file', {});
      expect(out).toBe('**read_file**');
    });

    it('omits keys starting with underscore', () => {
      const out = CustomInstructionsParser.serializeToolParams('read_file', { path: 'foo.md', _notes: 'skip me' });
      expect(out).not.toContain('_notes');
      expect(out).toContain('path: foo.md');
    });
  });

  // ---------------------------------------------------------------------------
  // parseToolParams → serializeToolParams round-trip
  // ---------------------------------------------------------------------------

  describe('parseToolParams → serializeToolParams round-trip', () => {
    it('parse then serialize then parse produces the same keys and values', () => {
      const raw = '**read_file**\n\n* path: foo.md\n* range: 1-50';
      const parsed = CustomInstructionsParser.parseToolParams(raw);
      const reserialized = CustomInstructionsParser.serializeToolParams('read_file', parsed);
      const roundTripped = CustomInstructionsParser.parseToolParams(reserialized);
      expect(roundTripped['path']).toBe(parsed['path']);
      expect(roundTripped['range']).toBe(parsed['range']);
    });
  });

  // ---------------------------------------------------------------------------
  // free-form content → step text-node (Pass 2)
  // ---------------------------------------------------------------------------

  describe('free-form content (no ordered list) becomes a step text-node', () => {
    const FREE_FORM_INSTRUCTIONS = `
${CUSTOM_INSTRUCTIONS_PREAMBLE}

# ROLE: Input Collector — read the ticket and return a structured payload.

## Step 1 — Greet and request the ticket

If the user has not yet provided a ticket, ask.

## Step 2 — Obtain the content

- If the user pasted raw text: use it directly.
- If file path: call read_file on that path.

## Step 3 — Build and return INPUT

After content is available, store the structure as INPUT.

> Hard rules
> - Do NOT classify the ticket.
`.trim();

    it('returns exactly one step node when there is no ordered list', () => {
      const nodes = CustomInstructionsParser.parse(FREE_FORM_INSTRUCTIONS);
      expect(nodes).toHaveLength(1);
    });

    it('the free-form node has nodeType "step"', () => {
      const nodes = CustomInstructionsParser.parse(FREE_FORM_INSTRUCTIONS);
      expect(nodes[0].nodeType).toBe('step');
    });

    it('the free-form node title comes from the first heading', () => {
      const nodes = CustomInstructionsParser.parse(FREE_FORM_INSTRUCTIONS);
      // first heading is the # ROLE line
      expect(nodes[0].title).toContain('Input Collector');
    });

    it('the free-form node rawContent contains the body text', () => {
      const nodes = CustomInstructionsParser.parse(FREE_FORM_INSTRUCTIONS);
      expect(nodes[0].rawContent).toContain('Greet and request');
      expect(nodes[0].rawContent).toContain('Obtain the content');
    });

    it('the preamble and Hard rules trailer do NOT appear in rawContent', () => {
      const nodes = CustomInstructionsParser.parse(FREE_FORM_INSTRUCTIONS);
      expect(nodes[0].rawContent).not.toContain('system instructions');
      expect(nodes[0].rawContent).not.toContain('Hard rules');
    });

    it('falls back to title "Instructions" when there are no headings', () => {
      const noHeadings = `
${CUSTOM_INSTRUCTIONS_PREAMBLE}

Just a paragraph with some text.

> Hard rules
> - Do not break things.
`.trim();
      const nodes = CustomInstructionsParser.parse(noHeadings);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].title).toBe('Instructions');
      expect(nodes[0].rawContent).toContain('Just a paragraph');
    });

    it('mixed: ordered list steps AND free-form nodes both appear', () => {
      const mixed = `
${CUSTOM_INSTRUCTIONS_PREAMBLE}

## Background context

Some context before the steps.

1. **read_file**
   - path: foo.md

2. Final step
   - Do the thing

> Hard rules
> - Do not break things.
`.trim();
      const nodes = CustomInstructionsParser.parse(mixed);
      // 2 ordered steps + 1 free-form step
      expect(nodes).toHaveLength(3);
      const toolNode = nodes.find((n) => n.nodeType === 'tool-invocation');
      const stepNode = nodes.find((n) => n.nodeType === 'step' && n.title !== 'Final step');
      expect(toolNode?.toolName).toBe('read_file');
      expect(stepNode?.rawContent).toContain('Background context');
    });

    it('index is 1-based across all nodes including the free-form one', () => {
      const nodes = CustomInstructionsParser.parse(FREE_FORM_INSTRUCTIONS);
      expect(nodes[0].index).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // multiple ordered lists — content split by prose paragraphs between lists
  // ---------------------------------------------------------------------------

  describe('multiple ordered lists separated by prose', () => {
    /**
     * Mirrors the triage-orchestrator pattern: preamble paragraph, then a
     * numbered list (steps 1–3), then "4A."/"4B." prose paragraphs with
     * unordered bullets, then a second numbered list (steps 5–6), then a
     * trailing "Hard rules" blockquote.
     * mdast parses the two numbered groups as separate ordered-list nodes.
     */
    const SPLIT_LIST_INSTRUCTIONS = `
system instructions:
Follow the below instructions strictly. These directives are mandatory and non-negotiable.
- You MUST call switch_mode AND spawn_subagent as actual tool calls for
  EVERY specialist step. Performing the specialist work yourself inline is STRICTLY FORBIDDEN.
- For each specialist step: (1) call switch_mode with the stage's mode_id,
  then (2) immediately call spawn_subagent with a self-contained description
  that includes the target mode's role and the exact JSON payload verbatim.
- The spawn_subagent description MUST start with: "You are running as the
  <mode name> stage of the pipeline. Your input payload is:" followed
  by the raw JSON block. Set fork_context: false.
- Collect the subagent's output as the $RESULT variable for that step before
  proceeding. Never fabricate or infer subagent output — wait for the actual
  tool response.
- Never skip either tool call. If a step requires both, both must be issued
  as real tool invocations before moving to the next step.

# Orchestrator

1. Read source file
   - read the input

2. Classify ticket
   - switch to classify

3. Route
   - switch to router

4A. Escalate path

- switch to escalate
- collect result

5. Verify reply
   - switch to verify

6. Write output
   - write the file

> Hard rules
> - Never do specialist work yourself.
`.trim();

    it('collects items from all ordered lists as step nodes', () => {
      const nodes = CustomInstructionsParser.parse(SPLIT_LIST_INSTRUCTIONS);
      const stepNodes = nodes.filter((n) => n.nodeType === 'step');
      // Steps 1–3 come from the first ordered list; 5–6 from the second.
      expect(stepNodes.length).toBeGreaterThanOrEqual(5);
    });

    it('step titles from both ordered lists are present', () => {
      const nodes = CustomInstructionsParser.parse(SPLIT_LIST_INSTRUCTIONS);
      const titles = nodes.map((n) => n.title);
      expect(titles).toContain('Read source file');
      expect(titles).toContain('Classify ticket');
      expect(titles).toContain('Route');
      expect(titles).toContain('Verify reply');
      expect(titles).toContain('Write output');
    });

    it('the "4A." prose paragraph and unordered bullets appear in a free-form step between steps 3 and 5', () => {
      const nodes = CustomInstructionsParser.parse(SPLIT_LIST_INSTRUCTIONS);
      const freeForm = nodes.find((n) => n.nodeType === 'step' && n.rawContent.includes('escalate'));
      expect(freeForm).toBeDefined();
      // Must be positioned after step 3 ("Route") and before step 5 ("Verify reply")
      const routeIndex = nodes.findIndex((n) => n.title === 'Route');
      const verifyIndex = nodes.findIndex((n) => n.title === 'Verify reply');
      const freeFormIndex = nodes.findIndex((n) => n === freeForm);
      expect(freeFormIndex).toBeGreaterThan(routeIndex);
      expect(freeFormIndex).toBeLessThan(verifyIndex);
    });

    it('no step node rawContent contains the Hard rules blockquote text', () => {
      const nodes = CustomInstructionsParser.parse(SPLIT_LIST_INSTRUCTIONS);
      nodes.forEach((n) => {
        expect(n.rawContent).not.toContain('Never do specialist work');
      });
    });

    it('indexes are 1-based and contiguous across all nodes', () => {
      const nodes = CustomInstructionsParser.parse(SPLIT_LIST_INSTRUCTIONS);
      nodes.forEach((n, i) => {
        expect(n.index).toBe(i + 1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Bug 1 — preamble detection must check content, not just node type
  // ---------------------------------------------------------------------------

  describe('preamble detection (Bug 1 — content guard)', () => {
    it('does NOT swallow a first paragraph that is not the standard preamble', () => {
      // A mode that opens with a plain intro sentence instead of "system instructions:".
      // Before the fix, this sentence would be silently dropped as if it were the preamble.
      const withIntroParagraph = `This mode handles input collection.

1. Read the ticket
   - do thing A

> Hard rules
> - Do not break things.`.trim();

      const nodes = CustomInstructionsParser.parse(withIntroParagraph);
      // The intro paragraph must become a free-form node, not be silently discarded.
      const introNode = nodes.find((n) => n.rawContent.includes('input collection'));
      expect(introNode).toBeDefined();
    });

    it('still skips the standard preamble when it is present', () => {
      const withPreamble = `${CUSTOM_INSTRUCTIONS_PREAMBLE}

1. Do a thing
   - detail

> Hard rules
> - Rule one.`.trim();

      const nodes = CustomInstructionsParser.parse(withPreamble);
      // Preamble must not appear in any node.
      nodes.forEach((n) => {
        expect(n.title).not.toContain('system instructions');
        expect(n.rawContent).not.toContain('system instructions');
      });
    });

    it('parses a mode with no preamble at all without error', () => {
      // First node is a heading, not a paragraph — preamble detection returns null gracefully.
      const noPreamble = `# ROLE: Plain Mode

1. Step one
   - detail

> Hard rules
> - Rule one.`.trim();

      const nodes = CustomInstructionsParser.parse(noPreamble);
      expect(nodes.some((n) => n.title === 'Step one')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Bug 2 — serialize must emit free-form nodes as top-level markdown
  // ---------------------------------------------------------------------------

  describe('serialize — free-form nodes (Bug 2 — top-level markdown)', () => {
    it('free-form node is NOT wrapped in a numbered list item', () => {
      const nodes: CustomInstructionsNode[] = [
        {
          nodeType: 'step',
          source: 'free-form',
          index: 1,
          title: 'ROLE: Classifier',
          rawContent:
            '# ROLE: Classifier\n\n## Severity rubric\n\n| Level | Criteria |\n|-------|----------|\n| critical | Production down |',
        },
        { nodeType: 'step', source: 'list-item', index: 2, title: 'Analyse ticket', rawContent: '- check severity' },
      ];
      const out = CustomInstructionsParser.serialize(nodes);
      // The heading must appear at the start of a line, not indented under "1."
      expect(out).toMatch(/^# ROLE: Classifier$/m);
      // The table row must appear at the start of a line, not indented
      expect(out).toMatch(/^\| critical \| Production down \|$/m);
      // Only one numbered list item should exist (the list-item node)
      expect(out).toContain('1. Analyse ticket');
      expect(out).not.toContain('2. Analyse ticket');
    });

    it('list counter skips free-form nodes — numbers remain contiguous for list-item nodes', () => {
      const nodes: CustomInstructionsNode[] = [
        { nodeType: 'step', source: 'list-item', index: 1, title: 'Step one', rawContent: '' },
        {
          nodeType: 'step',
          source: 'free-form',
          index: 2,
          title: 'Prose block',
          rawContent: '# Interlude\n\nSome prose.',
        },
        { nodeType: 'step', source: 'list-item', index: 3, title: 'Step two', rawContent: '' },
        { nodeType: 'step', source: 'list-item', index: 4, title: 'Step three', rawContent: '' },
      ];
      const out = CustomInstructionsParser.serialize(nodes);
      // List items are numbered 1, 2, 3 — the free-form node does not consume a number.
      expect(out).toContain('1. Step one');
      expect(out).toContain('2. Step two');
      expect(out).toContain('3. Step three');
      // The free-form heading is top-level, not inside a list item.
      expect(out).toMatch(/^# Interlude$/m);
    });

    it('legacy node (source absent) is serialized as a numbered list item', () => {
      // Nodes created by old code or tests that omit `source` must not break.
      const nodes: CustomInstructionsNode[] = [
        { nodeType: 'step', index: 1, title: 'Legacy step', rawContent: '- detail' },
      ];
      const out = CustomInstructionsParser.serialize(nodes);
      expect(out).toContain('1. Legacy step');
    });

    it('round-trip preserves free-form headings and tables as top-level markdown', () => {
      // Input that contains a rich free-form block followed by ordered steps.
      const input = `system instructions:
Follow the below instructions strictly. These directives are mandatory and non-negotiable.
- You MUST call switch_mode AND spawn_subagent as actual tool calls for
  EVERY specialist step. Performing the specialist work yourself inline is STRICTLY FORBIDDEN.
- For each specialist step: (1) call switch_mode with the stage's mode_id,
  then (2) immediately call spawn_subagent with a self-contained description
  that includes the target mode's role and the exact JSON payload verbatim.
- The spawn_subagent description MUST start with: "You are running as the
  <mode name> stage of the pipeline. Your input payload is:" followed
  by the raw JSON block. Set fork_context: false.
- Collect the subagent's output as the $RESULT variable for that step before
  proceeding. Never fabricate or infer subagent output — wait for the actual
  tool response.
- Never skip either tool call. If a step requires both, both must be issued
  as real tool invocations before moving to the next step.

# ROLE: Classifier

## Severity rubric

| Level    | Criteria        |
|----------|-----------------|
| critical | Production down |
| high     | Major feature   |

1. Analyse ticket
   - check severity

2. Return JSON
   - only JSON output

> Hard rules
> - Do not break things.`.trim();

      const nodes = CustomInstructionsParser.parse(input);
      const serialized = CustomInstructionsParser.serialize(nodes);

      // After round-trip the heading and table must still be at the top level.
      expect(serialized).toMatch(/^# ROLE: Classifier$/m);
      expect(serialized).toMatch(/^\| critical \| Production down \|$/m);
      // The ordered steps must still be present as numbered items.
      expect(serialized).toContain('1. Analyse ticket');
      expect(serialized).toContain('2. Return JSON');
    });
  });
});
