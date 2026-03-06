/**
 * Utility functions for working with XML namespaces and qualified names.
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
  const prefix = getPrefixForNamespaceURI(namespaceURI, namespaceMap);
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

/**
 * Ensures a namespace URI is registered in the namespace map, no-op if already present.
 * Uses `preferredPrefix` when supplied and not already taken; otherwise assigns the next
 * available deterministic prefix (ns0, ns1, …).
 *
 * @param namespaceURI - The namespace URI to register
 * @param namespaceMap - Map of namespace prefixes to URIs (mutated in place)
 * @param preferredPrefix - Optional preferred prefix to use when available
 */
export function ensureNamespaceRegistered(
  namespaceURI: string | null,
  namespaceMap: Record<string, string>,
  preferredPrefix?: string,
): void {
  if (!namespaceURI) return;
  if (Object.values(namespaceMap).includes(namespaceURI)) return;
  let prefix = preferredPrefix && !namespaceMap[preferredPrefix] ? preferredPrefix : '';
  if (!prefix) {
    for (let i = 0; ; i++) {
      if (!namespaceMap[`ns${i}`]) {
        prefix = `ns${i}`;
        break;
      }
    }
  }
  namespaceMap[prefix] = namespaceURI;
}

/**
 * Returns the prefix registered for the given namespace URI, or `''` if not found.
 *
 * @param namespaceURI - The namespace URI to look up
 * @param namespaceMap - Map of namespace prefixes to URIs
 * @returns The prefix string, or `''` when the URI is not registered
 */
export function getPrefixForNamespaceURI(
  namespaceURI: string | null | undefined,
  namespaceMap: Record<string, string>,
): string {
  if (!namespaceURI) return '';
  return Object.entries(namespaceMap).find(([, uri]) => uri === namespaceURI)?.[0] ?? '';
}

/**
 * Splits a prefixed name string (`"prefix:localPart"` or `"localPart"`) into its components.
 *
 * @param qNameString - The string to parse
 * @returns Object with `prefix` (empty string when absent) and `localPart`
 */
export function parseQNameString(qNameString: string): { prefix: string; localPart: string } {
  const colonIdx = qNameString.indexOf(':');
  if (colonIdx < 0) return { prefix: '', localPart: qNameString };
  return { prefix: qNameString.slice(0, colonIdx), localPart: qNameString.slice(colonIdx + 1) };
}
