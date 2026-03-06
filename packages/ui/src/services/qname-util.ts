/**
 * Utility functions for working with QNames (Qualified Names) in XML schemas.
 */

/**
 * Format a QName as `prefix:localPart` using the namespace map.
 * Falls back to the provided fallback string if the QName is null.
 *
 * @param qName - The QName object with getNamespaceURI() and getLocalPart() methods
 * @param namespaceMap - Map of namespace prefixes to URIs
 * @param fallback - Fallback string to return if QName is null or invalid
 * @returns Formatted string like "xs:string" or "ns0:EmployeeType"
 *
 * @example
 * ```ts
 * const qname = new QName('http://www.w3.org/2001/XMLSchema', 'string');
 * const namespaceMap = { 'xs': 'http://www.w3.org/2001/XMLSchema' };
 * formatQNameWithPrefix(qname, namespaceMap, 'string'); // Returns "xs:string"
 * ```
 */
export function formatQNameWithPrefix(
  qName: { getNamespaceURI: () => string; getLocalPart: () => string | null } | null | undefined,
  namespaceMap: Record<string, string>,
  fallback: string,
): string {
  if (!qName) return fallback;
  const nsURI = qName.getNamespaceURI();
  const localPart = qName.getLocalPart();
  if (!localPart) return fallback;
  const prefix = Object.entries(namespaceMap).find(([, uri]) => uri === nsURI)?.[0] || '';
  return prefix ? `${prefix}:${localPart}` : localPart;
}

// Made with Bob
