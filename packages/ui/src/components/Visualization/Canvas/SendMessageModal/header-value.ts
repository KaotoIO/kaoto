type HeaderValueType = 'string' | 'boolean' | 'byte' | 'short' | 'int' | 'long' | 'float' | 'double' | 'char';

const HEADER_VALUE_TYPES = new Map<string, HeaderValueType>([
  ['String', 'string'],
  ['Boolean', 'boolean'],
  ['Byte', 'byte'],
  ['Short', 'short'],
  ['Integer', 'int'],
  ['Long', 'long'],
  ['Float', 'float'],
  ['Double', 'double'],
  ['Character', 'char'],
]);
const PRIMITIVE_TYPES = new Set<HeaderValueType>([
  'boolean',
  'byte',
  'short',
  'int',
  'long',
  'float',
  'double',
  'char',
]);

export const getHeaderValueType = (javaType?: string): HeaderValueType | undefined => {
  if (!javaType) return undefined;
  if (PRIMITIVE_TYPES.has(javaType as HeaderValueType)) return javaType as HeaderValueType;
  return HEADER_VALUE_TYPES.get(javaType.replace(/^java\.lang\./, ''));
};

const INTEGER_RANGES = {
  byte: [-128n, 127n],
  short: [-32768n, 32767n],
  int: [-2147483648n, 2147483647n],
  long: [-9223372036854775808n, 9223372036854775807n],
} as const;

export const validateHeaderValue = (value: string, javaType?: string): string | undefined => {
  const type = getHeaderValueType(javaType);
  if (!type || type === 'string') return undefined;

  if (type === 'boolean') {
    return value === 'true' || value === 'false' ? undefined : 'Choose true or false.';
  }
  if (type === 'char') {
    return value.length === 1 ? undefined : 'Enter a single Java character.';
  }
  if (type === 'float' || type === 'double') {
    const number = Number(value);
    const isValid =
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) &&
      Number.isFinite(number) &&
      (type !== 'float' || Number.isFinite(Math.fround(number)));
    return isValid ? undefined : `Enter a finite ${type} value within its supported range.`;
  }

  const [min, max] = INTEGER_RANGES[type];
  if (/^[+-]?\d+$/.test(value)) {
    const integer = BigInt(value);
    if (integer >= min && integer <= max) return undefined;
  }
  return `Enter a whole number between ${min} and ${max}.`;
};
