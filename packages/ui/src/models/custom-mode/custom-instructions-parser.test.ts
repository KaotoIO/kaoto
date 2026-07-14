import { CustomInstructionsParser } from './custom-instructions-parser';
import { CUSTOM_INSTRUCTIONS_PREAMBLE, CUSTOM_INSTRUCTIONS_TRAILER } from './custom-mode-constants';
import { CustomInstructionsNode } from './custom-mode-types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** Minimal well-formed customInstructions block (3 steps + blockquote). */
const MINIMAL_INSTRUCTIONS = `
system instructions:
follow the below instructions strictly.

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
`.trim();

/** Instructions with no ordered list — only prose and a heading. */
const NO_LIST_INSTRUCTIONS = `
# ROLE: Prose Only

This mode has no numbered steps, just free-form prose.
`.trim();

/** Orchestrator-style 5-step instructions (mirrors examples/custom_modes_jd.yaml). */
const ORCHESTRATOR_INSTRUCTIONS = `
system instructions:
follow the below instructions strictly.
 **switch_mode** -- if you see this. switch to the desired mode and proceed to spawn a subagent
 **spawn_subagent** -- if you see this. spawn a subagent. 

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
`.trim();

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

    it('returns [] when there is no ordered list', () => {
      expect(CustomInstructionsParser.parse(NO_LIST_INSTRUCTIONS)).toEqual([]);
    });

    it('returns one node per numbered list item (3-step fixture)', () => {
      expect(CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS)).toHaveLength(3);
    });

    it('returns 5 nodes for the orchestrator fixture', () => {
      expect(CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS)).toHaveLength(5);
    });

    it('every node has nodeType "step"', () => {
      CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS).forEach((n) => {
        expect(n.nodeType).toBe('step');
      });
    });

    it('index is 1-based and matches list order', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      expect(nodes[0].index).toBe(1);
      expect(nodes[1].index).toBe(2);
      expect(nodes[2].index).toBe(3);
    });

    it('title is the plain text of the first paragraph (no markdown)', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      expect(nodes[0].title).toBe('First step');
      expect(nodes[1].title).toBe('Second step');
      expect(nodes[2].title).toBe('Third step');
    });

    it('rawContent is non-empty', () => {
      CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS).forEach((n) => {
        expect(n.rawContent.length).toBeGreaterThan(0);
      });
    });

    it('rawContent of step 1 includes sub-bullet text', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      expect(nodes[0].rawContent).toContain('do thing A');
      expect(nodes[0].rawContent).toContain('do thing B');
    });

    it('rawContent of step 2 contains the bold tool reference', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      // toMarkdown escapes underscores in non-code spans (read_file → read\_file)
      expect(nodes[1].rawContent).toMatch(/read.?_?.?file/);
    });

    it('rawContent does NOT contain the heading or blockquote', () => {
      const nodes = CustomInstructionsParser.parse(MINIMAL_INSTRUCTIONS);
      nodes.forEach((n) => {
        expect(n.rawContent).not.toContain('ROLE:');
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

    it('step 1 title is "Read source file" (orchestrator)', () => {
      const nodes = CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS);
      expect(nodes[0].title).toBe('Read source file');
    });

    it('step 2 title contains the parallel note (orchestrator)', () => {
      const nodes = CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS);
      expect(nodes[1].title).toMatch(/Rewrite \+ Skills Extraction/);
    });

    it('step 5 title is "Write output file" (orchestrator)', () => {
      const nodes = CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS);
      expect(nodes[4].title).toBe('Write output file');
    });

    it('step 1 rawContent contains the update_todo_list tool ref (orchestrator)', () => {
      const nodes = CustomInstructionsParser.parse(ORCHESTRATOR_INSTRUCTIONS);
      expect(nodes[0].rawContent).toMatch(/update.?_?.?todo.?_?.?list/);
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

    it('blockquote content (Hard rules) is not extracted — steps count unchanged', () => {
      // MINIMAL_INSTRUCTIONS has a blockquote; it must not surface as a step
      const { steps } = CustomInstructionsParser.parseAll(MINIMAL_INSTRUCTIONS);
      expect(steps).toHaveLength(3);
    });

    it('table content is not extracted — steps are still found correctly', () => {
      // Feed instructions that contain a GFM table before the ordered list
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
      expect(steps).toHaveLength(2);
      expect(steps[0].title).toBe('Extract skills');
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

    it('produces an ordered-list markdown string', () => {
      const nodes: CustomInstructionsNode[] = [
        { nodeType: 'step', index: 1, title: 'Alpha', rawContent: 'Alpha\n\n- sub A' },
        { nodeType: 'step', index: 2, title: 'Beta', rawContent: 'Beta' },
      ];
      const out = CustomInstructionsParser.serialize(nodes);
      expect(out).toContain('1. Alpha');
      expect(out).toContain('2. Beta');
    });

    it('re-injects the static preamble at the start', () => {
      const nodes: CustomInstructionsNode[] = [
        { nodeType: 'step', index: 1, title: 'Do something', rawContent: 'Do something' },
      ];
      const out = CustomInstructionsParser.serialize(nodes);
      expect(out).toContain('system instructions:');
      expect(out).toContain('switch_mode');
      expect(out.indexOf(CUSTOM_INSTRUCTIONS_PREAMBLE)).toBe(0);
    });

    it('appends the static trailer at the end', () => {
      const nodes: CustomInstructionsNode[] = [
        { nodeType: 'step', index: 1, title: 'Do something', rawContent: 'Do something' },
      ];
      const out = CustomInstructionsParser.serialize(nodes);
      expect(out).toContain('> Hard rules');
      expect(out.trimEnd().endsWith(CUSTOM_INSTRUCTIONS_TRAILER.trimEnd())).toBe(true);
    });

    it('preamble comes before steps and trailer comes after', () => {
      const nodes: CustomInstructionsNode[] = [{ nodeType: 'step', index: 1, title: 'Middle', rawContent: 'Middle' }];
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
        rawContent: `Step ${i + 1}\n- detail line`,
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
      expect(serialized).toContain('1. First step');
      expect(serialized).toContain('> Hard rules');
    });
  });
});
