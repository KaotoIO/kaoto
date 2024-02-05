import set from 'lodash.set';
import { ROOT_PATH } from './get-value';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setValue = (obj: any, path: string | string[], value: any): void => {
  if (path === ROOT_PATH) {
    Object.assign(obj, value);
    return;
  }

  set(obj, path, value);
};
