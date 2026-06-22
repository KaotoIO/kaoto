/**
 * Pure helpers for preserving leading XML comments across a parse/serialize round-trip.
 * Mirrors the yaml-comments helpers for the XML resource.
 *
 * The stored format matches what appears in the source: full `<!-- ... -->` strings.
 * Blank lines between leading comments are preserved as empty-string entries, exactly
 * as yaml-comments does for `#`-prefixed lines.
 */
const COMMENT_REGEX = /<!--([\s\S]*?)-->/g;

/**
 * Extracts leading XML comments (those appearing before the first non-whitespace,
 * non-comment content) and returns the full `<!-- ... -->` strings, preserving blank
 * lines between leading comments as empty-string entries.
 */
export function parseXmlComments(xml: string): string[] {
  const comments: string[] = [];
  let match;
  let index = 0;
  COMMENT_REGEX.lastIndex = 0;
  while ((match = COMMENT_REGEX.exec(xml)) !== null) {
    const between = xml.slice(index, match.index);
    if (between.trim() === '') {
      comments.push(
        ...between
          .split('\n')
          .slice(1, -1)
          .filter((line) => line === '')
          .map(() => ''),
      );
      comments.push(match[0]);
      index = match.index + match[0].length;
    } else {
      break;
    }
  }
  return comments;
}

/**
 * Prepends the given comments above the serialized XML string.
 * Each entry is used verbatim (full `<!-- ... -->` string or empty string for blank lines),
 * joined with newlines — the same contract as insertYamlComments.
 */
export function insertXmlComments(xml: string, comments: string[]): string {
  if (comments.length === 0) return xml;
  return comments.join('\n') + '\n' + xml;
}
