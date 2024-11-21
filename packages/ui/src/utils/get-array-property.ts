import { get } from 'lodash';
import { set } from 'lodash';

export const getArrayProperty = (model: object, path: string): unknown[] => {
  let stepsArray: unknown[] | undefined = get(model, path);

  if (!Array.isArray(stepsArray)) {
    set(model, path, []);
    stepsArray = get(model, path) as unknown[];
  }

  return stepsArray;
};
