import { isDefined } from '.';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNonDefaultSchema(obj1: Record<string, any>, obj2: Record<string, any>): string[] {
  const result = [] as string[];

  if (!isDefined(obj1) || !isDefined(obj2)) return result;

  for (const key in obj1) {
    if (key in obj2) {
      if ('default' in obj1[key]) {
        if (!(obj1[key]['default'] == obj2[key])) result.push(key);
      } else {
        result.push(key);
      }
    }
  }

  return result;
}
