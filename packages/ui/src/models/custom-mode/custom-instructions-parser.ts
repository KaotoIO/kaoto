import type { List, ListItem, Root } from 'mdast';
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
 * 1. Step title                 ← each ordered list item → one step node
 *    - sub-bullet               ← nested list items stay inside rawContent
 *    - sub-bullet
 * 2. Next step
 *    ...
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
   */
  private static parseSteps(tree: Root): CustomInstructionsNode[] {
    const list = tree.children.find((node): node is List => node.type === 'list' && node.ordered === true);
    if (!list) return [];

    return list.children.map((item: ListItem, i: number) => {
      const firstParagraph = item.children.find((c) => c.type === 'paragraph');
      const title = firstParagraph ? toString(firstParagraph) : '';
      const rawContent = toMarkdown({ type: 'root', children: item.children });
      return {
        nodeType: 'step',
        rawContent: rawContent.trim(),
        title: title.trim(),
        index: i + 1,
      } satisfies CustomInstructionsNode;
    });
  }

  /**
   * Convenience wrapper — returns only the steps array.
   * Used by CustomModeVisualEntity which only needs steps for canvas nodes.
   */
  static parse(raw: string): CustomInstructionsNode[] {
    return CustomInstructionsParser.parseAll(raw).steps;
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
