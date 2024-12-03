import { get, set } from 'lodash';

export const getArrayProperty = <T>(model: object, path: string): T[] => {
  let stepsArray: T[] | undefined = get(model, path);

  if (!Array.isArray(stepsArray)) {
    set(model, path, []);
    stepsArray = get(model, path) as T[];
  }

  return stepsArray;
};
