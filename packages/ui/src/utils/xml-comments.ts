/**
 * Pure helpers for preserving leading XML comments across a parse/serialize round-trip.
 * Mirrors the yaml-comments helpers for the XML resource.
 */
const COMMENT_REGEX = /<!--([\s\S]*?)-->/g;

/**
 * Extracts leading XML comments (those appearing before the first non-whitespace,
 * non-comment content) and returns their trimmed inner text.
 */
export function parseXmlComments(xml: string): string[] {
  const comments: string[] = [];
  let match;
  let index = 0;
  while ((match = COMMENT_REGEX.exec(xml)) !== null) {
    if (xml.slice(index, match.index).trim() === '') {
      comments.push(match[1].trim());
      index = match.index + match[0].length;
    } else {
      break;
    }
  }
  return comments;
}

/**
 * Prepends the given comments as XML comment nodes above the serialized XML string.
 */
export function insertXmlComments(xml: string, comments: string[]): string {
  if (comments.length === 0) return xml;
  const commentsString = comments.map((comment) => `<!-- ${comment} -->`).join('\n');
  return commentsString + '\n' + xml;
}
