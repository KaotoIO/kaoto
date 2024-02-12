// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNonDefaultProperties(obj1: Record<string, any>, obj2: Record<string, any>): Record<string, unknown> {
  const newModelUpdated = Object.entries(obj2.parameters as object).reduce(
    (acc: [string, unknown][], currentValue: [string, unknown]) => {
      if (!(obj1[currentValue[0]]['default'] == currentValue[1])) {
        acc.push(currentValue);
      }
      return acc;
    },
    [],
  );
  return { ...obj2, parameters: Object.fromEntries(newModelUpdated) };
}
