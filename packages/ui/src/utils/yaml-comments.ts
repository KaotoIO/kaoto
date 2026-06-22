/**
 * Pure helpers for preserving leading YAML comments across a parse/serialize round-trip.
 * Extracted from the former YamlCamelResourceSerializer so resources can own comment handling.
 */
const COMMENTED_LINES_REGEXP = /^\s*#.*$/;

export function parseYamlComments(code: string): string[] {
  const lines = code.split('\n');
  const comments: string[] = [];
  for (const line of lines) {
    if (line.trim() === '' || COMMENTED_LINES_REGEXP.test(line)) {
      comments.push(line);
    } else {
      break;
    }
  }
  return comments;
}

export function insertYamlComments(code: string, comments: string[]): string {
  if (comments.length === 0) return code;
  const commentsString = comments.join('\n');
  return commentsString + '\n' + code;
}
