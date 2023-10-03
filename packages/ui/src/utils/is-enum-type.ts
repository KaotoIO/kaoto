export function isEnumType<T extends object>(type: unknown, enumObject: T): type is keyof T {
  return typeof type === 'string' && (type as keyof typeof enumObject) in enumObject;
}
