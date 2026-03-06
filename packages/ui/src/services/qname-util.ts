export function buildPrefixedName(
  localPart: string,
  namespaceURI: string | null,
  namespaceMap: Record<string, string>,
): string {
  if (!namespaceURI) return localPart;
  const prefix = Object.entries(namespaceMap).find(([, uri]) => uri === namespaceURI)?.[0];
  return prefix ? `${prefix}:${localPart}` : localPart;
}
