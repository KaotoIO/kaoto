export const isRawString = (value: unknown): boolean => {
  if (!value || typeof value !== 'string') return false;

  return value.startsWith('RAW(') && value.endsWith(')');
};
