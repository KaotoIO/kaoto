import { parseImageDataUri } from './data-uri';

describe('parseImageDataUri', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

  it('should parse a base64 SVG data URI', () => {
    const result = parseImageDataUri(`data:image/svg+xml;base64,${btoa(svg)}`);

    expect(result?.mimeType).toBe('image/svg+xml');
    expect(result?.extension).toBe('svg');
    expect(decode(result!.bytes)).toBe(svg);
  });

  it('should parse a base64 PNG data URI', () => {
    const result = parseImageDataUri('data:image/png;base64,iVBORw0KGgo=');

    expect(result?.mimeType).toBe('image/png');
    expect(result?.extension).toBe('png');
    expect(Array.from(result!.bytes)).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it.each([
    ['image/jpeg', 'jpg'],
    ['image/gif', 'gif'],
    ['image/webp', 'webp'],
  ])('should map %s to the .%s extension', (mimeType, extension) => {
    expect(parseImageDataUri(`data:${mimeType};base64,AAAA`)?.extension).toBe(extension);
  });

  it('should parse a non-base64 data URI with extra parameters', () => {
    const result = parseImageDataUri(`data:image/svg+xml;charset=utf-8,${svg}`);

    expect(result?.extension).toBe('svg');
    expect(decode(result!.bytes)).toBe(svg);
  });

  it('should parse a percent-encoded data URI', () => {
    const result = parseImageDataUri(`data:image/svg+xml,${encodeURIComponent(svg)}`);

    expect(decode(result!.bytes)).toBe(svg);
  });

  it('should be case-insensitive for the scheme and MIME type', () => {
    expect(parseImageDataUri('DATA:IMAGE/PNG;BASE64,AAAA')?.extension).toBe('png');
  });

  it.each([
    ['an http URL', 'https://example.com/icon.svg'],
    ['a relative path', './icon.svg'],
    ['an empty string', ''],
    ['an unsupported MIME type', 'data:image/bmp;base64,AAAA'],
    ['a non-image MIME type', 'data:text/plain;base64,AAAA'],
    ['malformed base64', 'data:image/png;base64,@@@not-base64@@@'],
    ['malformed percent-encoding', 'data:image/svg+xml,%E0%A4%A'],
    ['a data URI without a payload separator', 'data:image/png;base64'],
  ])('should return undefined for %s', (_label, value) => {
    expect(parseImageDataUri(value)).toBeUndefined();
  });

  it.each([[undefined], [null], [42], [{}]])('should return undefined for non-string value %p', (value) => {
    expect(parseImageDataUri(value)).toBeUndefined();
  });
});
