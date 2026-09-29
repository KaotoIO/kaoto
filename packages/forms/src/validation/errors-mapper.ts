import { ErrorObject } from 'ajv';
import { isDefined, ROOT_PATH } from '../utils';

const EMPTY_OBJECT = {};
const FORWARD_SLASH_REGEX = /\//g;

export const errorsMapper = (errors: ErrorObject[] | null | undefined = []): Record<string, string[]> => {
  if (!isDefined(errors) || errors.length === 0) {
    return EMPTY_OBJECT;
  }

  return errors.reduce(
    (acc, error) => {
      if (error.keyword !== 'required') {
        return acc;
      }

      const {
        instancePath,
        message,
        params: { missingProperty },
      } = error;

      if (message) {
        const path = `${ROOT_PATH}${instancePath.replace(FORWARD_SLASH_REGEX, '.')}.${missingProperty}`;
        acc[path] ??= [];
        acc[path].push(message);
      }

      return acc;
    },
    {} as Record<string, string[]>,
  );
};
