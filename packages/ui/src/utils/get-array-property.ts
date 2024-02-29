import get from 'lodash/get';
import set from 'lodash/set';

export const getArrayProperty = (model: object, path: string): unknown[] => {
  let stepsArray: unknown[] | undefined = get(model, path);

  if (!Array.isArray(stepsArray)) {
    set(model, path, []);
    stepsArray = get(model, path) as unknown[];
  }

  return stepsArray;
};
