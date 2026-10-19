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
    const bytes = isBase64 ? decodeBase64(payload) : decodePercentEncoded(payload);
    return { mimeType, extension, bytes };
  } catch {
    return undefined;
  }
};

const decodeBase64 = (payload: string): Uint8Array => {
  const binary = atob(payload);
  return Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0);
};

const parsePercentByte = (payload: string, index: number): number => {
  const hex = payload.slice(index + 1, index + 3);
  if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
    throw new URIError('URI malformed');
  }
  return Number.parseInt(hex, 16);
};

const appendUnescapedChar = (payload: string, index: number, bytes: number[], textEncoder: TextEncoder): number => {
  const codePoint = payload.codePointAt(index);
  if (codePoint === undefined) {
    return 1;
  }
  if (codePoint <= 0x7f) {
    bytes.push(codePoint);
    return 1;
  }

  const charString = String.fromCodePoint(codePoint);
  bytes.push(...textEncoder.encode(charString));
  return charString.length;
};

const decodePercentEncoded = (payload: string): Uint8Array => {
  const bytes: number[] = [];
  const textEncoder = new TextEncoder();

  for (let i = 0; i < payload.length; ) {
    if (payload[i] === '%') {
      bytes.push(parsePercentByte(payload, i));
      i += 3;
    } else {
      i += appendUnescapedChar(payload, i, bytes, textEncoder);
    }
  }

  return new Uint8Array(bytes);
};
