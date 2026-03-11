/**
 * Utility functions for working with QNames (Qualified Names) in XML schemas.
 */

/**
 * Format a prefixed name from a namespace URI and local part using the namespace map.
 *
 * @param namespaceURI - The namespace URI to look up
 * @param localPart - The local part of the name
 * @param namespaceMap - Map of namespace prefixes to URIs
 * @returns Formatted string like "xs:string" or "ns0:EmployeeType"
 */
export function formatWithPrefix(
  namespaceURI: string | null,
  localPart: string,
  namespaceMap: Record<string, string>,
): string {
  const prefix = namespaceURI ? Object.entries(namespaceMap).find(([, uri]) => uri === namespaceURI)?.[0] || '' : '';
  return prefix ? `${prefix}:${localPart}` : localPart;
}

/**
 * Format a QName as `prefix:localPart` using the namespace map.
 * Falls back to the provided fallback string if the QName is null.
 *
 * @param qName - The QName object with getNamespaceURI() and getLocalPart() methods
 * @param namespaceMap - Map of namespace prefixes to URIs
 * @param fallback - Fallback string to return if QName is null or invalid
 * @returns Formatted string like "xs:string" or "ns0:EmployeeType"
 */
export function formatQNameWithPrefix(
  qName: { getNamespaceURI: () => string; getLocalPart: () => string | null } | null | undefined,
  namespaceMap: Record<string, string>,
  fallback: string = '',
): string {
  if (!qName) return fallback;
  const localPart = qName.getLocalPart();
  if (!localPart) return fallback;
  return formatWithPrefix(qName.getNamespaceURI(), localPart, namespaceMap);
}
