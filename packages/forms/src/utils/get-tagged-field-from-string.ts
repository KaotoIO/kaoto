/**
 * Get the regex for a tag
 * Given a tagged value like group:producer (advanced), this function
 * will return the regex to match the value, up to the next pipe character
 * or the end of the string.
 * @param tag
 * @returns
 */
const getTagRegex = (tag: string) => {
  return new RegExp(`${tag}:(.*?)(?:\\||$)`);
};

export const extractGroup = (tag: string, input?: string): string => {
  if (!input) {
    return '';
  }

  const regex = getTagRegex(tag);
  const match = regex.exec(input);
  return match?.[1] ?? '';
};
