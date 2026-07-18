import type { BlockContent, List, ListItem, Paragraph, Root, Strong } from 'mdast';
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
 * Free-form content (headings, paragraphs, unordered lists, tables, etc.) that
 * sits between the preamble and the trailing blockquote but is NOT part of the
 * ordered list is collected into one or more `step` text-nodes.  The title of
 * each such node is derived from the first heading found, or 'Instructions' as
 * a fallback.  This lets content that doesn't follow the numbered-step format
 * appear on the canvas and be edited through the text-node form panel.
 *
 * The trailing blockquote ("Hard rules") is always stripped on parse and
 * re-injected by serialize().
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
   * Extracts all canvas nodes from the top-level AST in document order.
   *
   * Walks the top-level AST nodes once, skipping the canonical preamble block
   * and the trailing "Hard rules" blockquote.  For each remaining node:
   *   - Ordered list  → each list item becomes a `tool-invocation` or `step` node.
   *   - Anything else → accumulated into a "free-form buffer".  The buffer is
   *     flushed as a single `step` text-node whenever an ordered list is
   *     encountered next (or at end-of-document), preserving the position of
   *     free-form content relative to the numbered steps.
   *
   * This means that prose that sits between two numbered lists (e.g. the "4A / 4B"
   * paragraphs in the triage-orchestrator) appears as a canvas node between the
   * steps that surround it, not appended at the end.
   */
  private static parseSteps(tree: Root): CustomInstructionsNode[] {
    const allNodes = tree.children;

    // The canonical preamble is always emitted first by serialize(). With the
    // current markdown, it can span multiple top-level nodes (a paragraph
    // followed by a list), so skip the full emitted block only when the first
    // nodes match the canonical preamble AST exactly. This avoids swallowing
    // arbitrary user prose that merely starts with "system instructions".
    const preambleNodes = fromMarkdown(CUSTOM_INSTRUCTIONS_PREAMBLE).children;
    const preambleNodeCount =
      preambleNodes.length > 0 &&
      preambleNodes.every((preambleNode, index) => {
        const candidateNode = allNodes[index];
        return candidateNode !== undefined && toMarkdown(candidateNode).trim() === toMarkdown(preambleNode).trim();
      })
        ? preambleNodes.length
        : 0;

    // The trailer is always the last blockquote whose plain text starts with "Hard rules".
    const lastNode = allNodes[allNodes.length - 1];
    const trailerNode =
      lastNode?.type === 'blockquote' && toString(lastNode).startsWith('Hard rules') ? lastNode : null;

    const result: CustomInstructionsNode[] = [];
    let freeFormBuffer: BlockContent[] = [];

    /** Flush the accumulated free-form nodes as a single step text-node. */
    const flushFreeForm = () => {
      if (freeFormBuffer.length > 0) {
        result.push(CustomInstructionsParser.freeFormToStep(freeFormBuffer));
        freeFormBuffer = [];
      }
    };

    for (const [index, node] of allNodes.entries()) {
      // Always skip the preamble and trailer — they are hidden from the canvas.
      if (index < preambleNodeCount || node === trailerNode) continue;

      if (node.type === 'list' && (node as List).ordered) {
        // Flush any free-form content that preceded this ordered list so it
        // appears before these steps on the canvas.
        flushFreeForm();

        for (const item of (node as List).children as ListItem[]) {
          const firstParagraph = item.children.find((c): c is Paragraph => c.type === 'paragraph');
          const title = firstParagraph ? toString(firstParagraph) : '';

          const toolName = CustomInstructionsParser.extractToolName(firstParagraph);
          if (toolName !== undefined) {
            // tool-invocation: rawContent = entire list item (title bold + sub-bullets).
            // toMarkdown escapes underscores in text by default (read_file → read\_file).
            // Strip those backslashes so rawContent stores the canonical form (**read_file**)
            // and parseToolParams / extractToolName can re-parse it without escaping issues.
            const rawContent = toMarkdown({ type: 'root', children: item.children }, { bullet: '-' }).replace(
              /\\_/g,
              '_',
            );
            result.push({
              nodeType: 'tool-invocation',
              source: 'list-item',
              rawContent: rawContent.trim(),
              title: title.trim(),
              toolName,
              index: 0, // reindexed below
            } satisfies CustomInstructionsNode);
          } else {
            // step: rawContent = body only (everything after the first paragraph).
            // This keeps `content` (body) and `label` (title) independent in the form.
            // Also strip toMarkdown's backslash-underscore escaping so the textarea shows
            // clean text (e.g. **read_file**, not **read\_file**).
            const bodyChildren = item.children.filter((c) => c !== firstParagraph);
            const rawContent = toMarkdown({ type: 'root', children: bodyChildren }, { bullet: '-' }).replace(
              /\\_/g,
              '_',
            );
            result.push({
              nodeType: 'step',
              source: 'list-item',
              rawContent: rawContent.trim(),
              title: title.trim(),
              index: 0, // reindexed below
            } satisfies CustomInstructionsNode);
          }
        }
      } else {
        // Non-ordered-list node — accumulate into the free-form buffer.
        freeFormBuffer.push(node as BlockContent);
      }
    }

    // Flush any trailing free-form content (e.g. a mode with only prose and no steps).
    flushFreeForm();

    // Assign 1-based indexes in document order.
    result.forEach((node, i) => {
      node.index = i + 1;
    });
    return result;
  }

  /**
   * Converts a group of free-form AST nodes into a single `step` text-node.
   *
   * The title is taken from the first heading found; if no heading is present,
   * the title defaults to `'Instructions'`.  The rawContent is the serialized
   * markdown of all nodes (underscore escaping stripped).
   */
  private static freeFormToStep(nodes: BlockContent[]): CustomInstructionsNode {
    const firstHeading = nodes.find((n) => n.type === 'heading');
    const title = firstHeading ? toString(firstHeading) : 'Instructions';
    const rawContent = toMarkdown({ type: 'root', children: nodes }, { bullet: '-' }).replace(/\\_/g, '_').trim();
    return {
      nodeType: 'step',
      source: 'free-form',
      rawContent,
      title,
      index: 0, // assigned by caller
    };
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
    const paramList = tree.children.find((n): n is List => n.type === 'list' && n.ordered === false);
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
      .map(([key, val]) => `- ${key}: ${val}`)
      .join('\n');

    return bullets ? `**${toolName}**\n\n${bullets}` : `**${toolName}**`;
  }

  /**
   * Serializes an array of CustomInstructionsNodes back into a full
   * customInstructions string, re-injecting the static preamble and trailer
   * so the output is valid for Bob to consume.
   *
   * Nodes with `source === 'free-form'` are emitted as top-level markdown
   * (headings, tables, prose, etc. must not be wrapped in a list item).
   * All other nodes (source === 'list-item' or source absent) are emitted
   * as numbered list items, interleaved with any free-form blocks in
   * document order.
   *
   * Any pre-existing blockquote content in the raw string is intentionally
   * replaced by the canonical CUSTOM_INSTRUCTIONS_TRAILER.
   */
  static serialize(nodes: CustomInstructionsNode[]): string {
    if (nodes.length === 0) return '';

    // Assign list-item counters only to list-item nodes (free-form nodes do
    // not consume a list number).
    let listCounter = 0;

    const parts = nodes.map((node) => {
      if (node.source === 'free-form') {
        // Emit the raw markdown directly — no list marker, no indentation.
        return node.rawContent;
      }

      // list-item or legacy node (source absent) → numbered list item.
      listCounter += 1;
      const prefix = `${listCounter}. `;
      const indent = ' '.repeat(prefix.length);

      // For step nodes, rawContent holds only the body (sub-bullets) while the
      // title is stored separately. Reconstruct: title on the first line, then
      // the body (if any) indented below.
      // For tool-invocation nodes, rawContent already contains the full item
      // (**toolName** + sub-bullets), so no reconstruction is needed.
      const stepContent = node.rawContent ? `${node.title}\n\n${node.rawContent}` : node.title;
      const fullContent = node.nodeType === 'step' ? stepContent : node.rawContent;

      return fullContent
        .split('\n')
        .map((line, lineIdx) => {
          const linePrefix = lineIdx === 0 ? prefix : indent;
          return `${linePrefix}${line}`;
        })
        .join('\n');
    });

    return `${CUSTOM_INSTRUCTIONS_PREAMBLE}\n\n${parts.join('\n')}\n\n${CUSTOM_INSTRUCTIONS_TRAILER}\n`;
  }
}
