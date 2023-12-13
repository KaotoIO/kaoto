import get from 'lodash.get';

export const getUriString = <T>(value: T | undefined | null): string | undefined => {
  /** For string-based processor definitions, we can return the definition itself */
  if (typeof value === 'string' && value !== '') {
    return value;
  }

  const uriString = get(value, 'uri');

  /** For object-based processor definitions, we can return the `uri` property if not empty */
  if (typeof uriString === 'string' && uriString !== '') {
    return uriString;
  }

  return undefined;
};
