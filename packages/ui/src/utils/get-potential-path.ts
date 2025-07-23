import { isDefined } from './is-defined';

const isValidInteger = (value?: string): boolean => {
  if (value === undefined || value === null) return false;

  const num = Number(value);
  return Number.isInteger(num) && num >= 0;
};

const incrementPath = (pathArray: string[], target: string, direction: string): string | undefined => {
  const currentValue = Number(target);

  if (direction === 'backward' && currentValue === 0) {
    return undefined; // Prevent going to negative index
  }

  const newValue = direction === 'forward' ? currentValue + 1 : currentValue - 1;
  const newPath = pathArray.concat(newValue.toString());

  return newPath.join('.');
};

export const getPotentialPath = (path?: string, direction: string = 'forward'): string | undefined => {
  if (!path) return undefined;

  const pathArray = path.split('.');
  const length = pathArray.length;

  if (length < 1) return undefined;

  const last = pathArray[length - 1];
  const penultimate = pathArray[length - 2];
  const lastIsInteger = isValidInteger(last);
  const penultimateIsInteger = isValidInteger(penultimate);

  // Last element is integer, penultimate is not
  if (lastIsInteger && isDefined(penultimate) && !penultimateIsInteger) {
    return incrementPath(pathArray.slice(0, -1), last, direction);
  }

  // Last element is not integer, penultimate is integer
  if (!lastIsInteger && penultimateIsInteger) {
    return incrementPath(pathArray.slice(0, -2), penultimate, direction);
  }

  // No valid pattern found
  return undefined;
};
