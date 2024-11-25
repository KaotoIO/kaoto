import { isEmpty, set } from 'lodash';
import { ROOT_PATH } from './get-value';
import { isDefined } from './is-defined';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setValue = (obj: any, path: string | string[], value: any): void => {
  if (!Array.isArray(value) && typeof value === 'object' && isEmpty(value)) {
    value = undefined;
  }

  if (path === ROOT_PATH) {
    if (isDefined(value)) {
      Object.assign(obj, value);
    } else {
      Object.keys(obj).forEach((key) => delete obj[key]);
    }
    return;
  }

  set(obj, path, value);
};
