/**
 * Converts a camelCase string to a space separated string.
 * @param str The camelCase string to convert.
 * @returns The space-separated string.
 */
export function camelCaseToSpaces(str: string, options?: { capitalize: boolean }): string {
  if (!str) {
    return '';
  }

  let spacedString = str.replace(/([a-z])([A-Z])/g, '$1 $2');

  if (options?.capitalize) {
    spacedString = spacedString.substring(0, 1).toUpperCase() + spacedString.slice(1);
  }

  return spacedString;
}
