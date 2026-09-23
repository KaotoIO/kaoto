/**
 * Capitalize the first letter of a string
 * @param str The string to capitalize
 * @returns The capitalized string
 */
export const capitalizeString = (str: string): string => {
  return str.substring(0, 1).toUpperCase() + str.slice(1);
};
