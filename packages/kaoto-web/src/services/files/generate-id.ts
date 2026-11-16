const toHex = (byte: number) => byte.toString(16).padStart(2, '0');

/**
 * A random UUID (version 4).
 *
 * Browsers only provide `crypto.randomUUID()` in secure contexts (HTTPS or `localhost`), so kaoto-web served over plain
 * HTTP from another host builds the UUID from `crypto.getRandomValues()`, which is available everywhere.
 */
export const generateId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Set the version (4) and the variant (RFC 9562) bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, toHex).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
