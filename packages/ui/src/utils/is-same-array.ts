/**
 * Check if two arrays have the same elements
 * It assumes that the arrays are made out of strings or numbers
 * and doesn't contain duplicates
 *
 * @param array1 The first array
 * @param array2 The second array
 * @returns True if the arrays have the same elements, false otherwise
 */
export const isSameArray = (array1: Array<string | number>, array2: Array<string | number>): boolean => {
  if (array1.length !== array2.length) {
    return false;
  }

  return array1.every((id) => array2.includes(id));
};
