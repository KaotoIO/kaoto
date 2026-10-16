export interface ParsedDataUri {
  mimeType: string;
  extension: string;
  bytes: Uint8Array;
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const DATA_URI_REGEX = /^data:([^;,]+)((?:;[^;,]+)*),(.*)$/is;

/**
 * Parses an image data URI, such as `data:image/svg+xml;base64,PHN2Zy4uLg==`.
 * Returns `undefined` if the value is not a supported, well-formed image data URI.
 */
export const parseImageDataUri = (value: unknown): ParsedDataUri | undefined => {
  if (typeof value !== 'string') return undefined;

  const match = DATA_URI_REGEX.exec(value.trim());
  if (!match) return undefined;

  const [, rawMimeType, rawParams, payload] = match;
  const mimeType = rawMimeType.toLowerCase();
  const extension = IMAGE_EXTENSIONS[mimeType];
  if (!extension) return undefined;

  const isBase64 = rawParams.toLowerCase().split(';').includes('base64');

  try {
    const bytes = isBase64 ? decodeBase64(payload) : new TextEncoder().encode(decodeURIComponent(payload));
    return { mimeType, extension, bytes };
  } catch {
    return undefined;
  }
};

const decodeBase64 = (payload: string): Uint8Array => {
  const binary = atob(payload);
  return Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0);
};
