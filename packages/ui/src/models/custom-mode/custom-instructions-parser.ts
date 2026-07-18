import type { List, ListItem, Paragraph, Root, Strong } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { toString } from 'mdast-util-to-string';

import { CUSTOM_INSTRUCTIONS_PREAMBLE, CUSTOM_INSTRUCTIONS_TRAILER } from './custom-mode-constants';
import type { CustomInstructionsNode, ParsedCustomInstructions } from './custom-mode-types';

/**
 * Parses and serializes the `customInstructions` field of a CustomMode.
 *
 * Expected markdown structure inside customInstructions:
 *
 * ```
 * system instructions:          ← static preamble — always skipped on parse,
 * follow the below instructions    always re-injected on serialize
 *
 * # ROLE: <title>               ← depth-1 heading — ignored (title comes from mode.name)
 *
 * 1. **tool_name**              ← tool invocation step — nodeType 'tool-invocation'
 *    - param: value             ← parameters stay in rawContent
 *
 * 2. Step title                 ← ordinary step — nodeType 'step'
 *    - sub-bullet               ← nested list items stay inside rawContent
 *    - sub-bullet
 * 3. Next step
 *    ...
 *
 * A step is identified as a tool invocation when its first paragraph consists
 * of a single `**strong**` node whose text matches a known tool name (no extra
 * inline nodes beside it).
 *
 * Tables, blockquotes ("Hard rules"), "Bias rules", "Verification loop", and
 * any other unstructured content are treated as free text — they are NOT
 * extracted into typed fields. They remain in the raw customInstructions string
 * and are round-tripped verbatim by serialize().
 * ```
 */
export class CustomInstructionsParser {
  /**
   * Full parse — returns only the ordered-list steps.
   * All other content (tables, blockquotes, prose) is left in the raw string.
   *
   * Returns an object with an empty steps array when raw is empty/whitespace-only.
   */
  static parseAll(raw: string): ParsedCustomInstructions {
    if (!raw.trim()) return { steps: [] };

    const tree: Root = fromMarkdown(raw);

    return {
      steps: CustomInstructionsParser.parseSteps(tree),
    };
  }

  /**
   * Extracts ordered-list items as step nodes.
   * Finds the first top-level ordered list; each item becomes one step.
   *
   * A step whose first paragraph contains only a single `**strong**` node is
   * classified as `'tool-invocation'`; the inner text becomes `toolName`.
   */
  private static parseSteps(tree: Root): CustomInstructionsNode[] {
    const list = tree.children.find((node): node is List => node.type === 'list' && node.ordered === true);
    if (!list) return [];

    return list.children.map((item: ListItem, i: number) => {
      const firstParagraph = item.children.find((c): c is Paragraph => c.type === 'paragraph');
      const title = firstParagraph ? toString(firstParagraph) : '';
      const rawContent = toMarkdown({ type: 'root', children: item.children });

      const toolName = CustomInstructionsParser.extractToolName(firstParagraph);
      if (toolName !== undefined) {
        return {
          nodeType: 'tool-invocation',
          rawContent: rawContent.trim(),
          title: title.trim(),
          toolName,
          index: i + 1,
        } satisfies CustomInstructionsNode;
      }

      return {
        nodeType: 'step',
        rawContent: rawContent.trim(),
        title: title.trim(),
        index: i + 1,
      } satisfies CustomInstructionsNode;
    });
  }

  /**
   * Returns the tool name if the paragraph consists solely of a single
   * `**strong**` inline node (optionally surrounded by whitespace-only text
   * nodes), otherwise returns `undefined`.
   *
   * Matches the format used in `custom_modes_jk.yaml`:
   *   `1. **read_file**`
   */
  private static extractToolName(paragraph: Paragraph | undefined): string | undefined {
    if (!paragraph) return undefined;

    // Filter out whitespace-only text nodes that mdast may inject around inlines.
    const meaningful = paragraph.children.filter((child) => !(child.type === 'text' && child.value.trim() === ''));

    if (meaningful.length !== 1) return undefined;
    const only = meaningful[0];
    if (only.type !== 'strong') return undefined;

    // The strong node itself must contain exactly one text child.
    const strongNode = only as Strong;
    if (strongNode.children.length !== 1) return undefined;
    const inner = strongNode.children[0];
    if (inner.type !== 'text') return undefined;

    const candidate = inner.value.trim();
    // Require at least one character and disallow spaces (tool names are snake_case).
    return candidate.length > 0 && !/\s/.test(candidate) ? candidate : undefined;
  }

  /**
   * Convenience wrapper — returns only the steps array.
   * Used by CustomModeVisualEntity which only needs steps for canvas nodes.
   */
  static parse(raw: string): CustomInstructionsNode[] {
    return CustomInstructionsParser.parseAll(raw).steps;
  }

  /**
   * Parses the parameter sub-bullets of a tool-invocation node's `rawContent`
   * into a flat key→value record suitable for populating a tool's schema form.
   *
   * The expected rawContent shape (as produced by toMarkdown) is:
   *   **tool_name**
   *
   *   * key1: value1
   *   * key2: value2
   *   * key3:
   *     * nested line 1
   *     * nested line 2
   *
   * Each top-level unordered bullet is split on the first `:`.  Values that
   * span nested sub-bullets are joined with a newline.  Bullets that have no
   * colon (free-form notes) are collected under the special key `_notes`.
   *
   * Returns an empty object when there are no parameter bullets.
   */
  static parseToolParams(rawContent: string): Record<string, string> {
    if (!rawContent.trim()) return {};

    const tree = fromMarkdown(rawContent);
    const paramList = tree.children.find((n): n is import('mdast').List => n.type === 'list' && n.ordered === false);
    if (!paramList) return {};

    const result: Record<string, string> = {};
    const notes: string[] = [];

    for (const item of paramList.children) {
      const text = toString(item).trim();
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0) {
        const key = text.slice(0, colonIdx).trim();
        const val = text.slice(colonIdx + 1).trim();
        result[key] = val;
      } else if (text) {
        notes.push(text);
      }
    }

    if (notes.length > 0) {
      result['_notes'] = notes.join('\n');
    }

    return result;
  }

  /**
   * Serializes a tool-invocation form value (key→value record) back into the
   * `rawContent` markdown string for a tool-invocation node.
   *
   * The output format is:
   *   **toolName**
   *
   *   * key1: value1
   *   * key2: value2
   *
   * Keys starting with `_` (internal, e.g. `_notes`) are skipped.
   */
  static serializeToolParams(toolName: string, params: Record<string, string>): string {
    const bullets = Object.entries(params)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, val]) => `* ${key}: ${val}`)
      .join('\n');

    return bullets ? `**${toolName}**\n\n${bullets}` : `**${toolName}**`;
  }

  /**
   * Serializes an array of CustomInstructionsNodes back into a full
   * customInstructions string, re-injecting the static preamble and trailer
   * so the output is valid for Bob to consume.
   *
   * Any pre-existing blockquote content in the raw string is intentionally
   * replaced by the canonical CUSTOM_INSTRUCTIONS_TRAILER.
   */
  static serialize(nodes: CustomInstructionsNode[]): string {
    if (nodes.length === 0) return '';

    const lines = nodes.map((node, i) => {
      // Dynamically compute the prefix length so that steps ≥ 10 (whose
      // marker "10. " is 4 chars) indent continuation lines correctly.
      // CommonMark requires continuation lines to be indented by the exact
      // number of characters in the list marker.
      const prefix = `${i + 1}. `;
      const indent = ' '.repeat(prefix.length);
      const body = node.rawContent
        .split('\n')
        .map((line, lineIdx) => (lineIdx === 0 ? `${prefix}${line}` : `${indent}${line}`))
        .join('\n');
      return body;
    });

    return `${CUSTOM_INSTRUCTIONS_PREAMBLE}\n\n${lines.join('\n')}\n\n${CUSTOM_INSTRUCTIONS_TRAILER}\n`;
  }
}
