import { capitalizeString } from './capitalize-string';

/**
 * Converts a camelCase string to a space separated string.
 * @param str The camelCase string to convert.
 * @returns The space-separated string.
 */
export function camelCaseToSpaces(str: string, options?: { capitalize: boolean }): string {
  if (!str) {
    return '';
  }

  const spacedString = str.replace(/([a-z])([A-Z])/g, '$1 $2');

  if (options?.capitalize) {
    return capitalizeString(spacedString);
  }

  return spacedString;
}
