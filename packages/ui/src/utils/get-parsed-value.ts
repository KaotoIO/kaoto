export const getParsedValue = (value: string): string | boolean | number => {
  /** Try to parse the boolean values */
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }

  /** Try to parse the number values */
  if (value.length > 0 && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  return value;
};
