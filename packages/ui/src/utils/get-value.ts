import { get } from 'lodash';

export const ROOT_PATH = '#';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getValue = (obj: unknown, path: string | string[], defaultValue?: any) => {
  if (path === ROOT_PATH) {
    return obj;
  }

  return get(obj, path, defaultValue);
};
