export function getNonEmptyProperties(obj: Record<string, unknown>): Record<string, unknown> {
  const result = Object.entries(obj.parameters as object).reduce(
    (acc: [string, unknown][], currentValue: [string, unknown]) => {
      switch (typeof currentValue[1]) {
        case 'string':
          if (currentValue[1].trim().length !== 0) {
            acc.push(currentValue);
          }
          break;
        case 'object':
          if (Object.keys(currentValue[1] as object).length !== 0) {
            acc.push(currentValue);
          }
          break;
        default:
          acc.push(currentValue);
      }
      return acc;
    },
    [],
  );
  return { ...obj, parameters: Object.fromEntries(result) };
}
