export class PathUtil {
  static normalizePath(path: string): string {
    const parts = path.split('/').filter((part) => part !== '.');
    const normalized: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        if (normalized.length > 0 && normalized.at(-1) !== '..') {
          normalized.pop();
        } else {
          normalized.push(part);
        }
      } else {
        normalized.push(part);
      }
    }
    return normalized.join('/');
  }

  /**
   * Converts a DataMapper node path into a stable identifier by removing only
   * the trailing random 4-digit suffix from each path segment.
   *
   * Examples:
   * - `fj-map-1255-2922` -> `fj-map-1255`
   * - `fj-string-City-8276-4288` -> `fj-string-City-8276`
   * - `fj-string-City-8276` -> `fj-string-City-8276`
   */
  static toStableNodePath(path: string): string {
    const parts = path.split('://');
    if (parts.length !== 2) {
      return path;
    }

    const [prefix, rawSegments] = parts;

    if (!rawSegments) {
      return `${prefix}://`;
    }

    const stableSegments = rawSegments.split('/').map((segment) => {
      const tokens = segment.split('-');
      if (tokens.length >= 3 && /^\d{4}$/.test(tokens.at(-1) ?? '') && /^\d{4}$/.test(tokens.at(-2) ?? '')) {
        return tokens.slice(0, -1).join('-');
      }
      return segment;
    });

    return `${prefix}://${stableSegments.join('/')}`;
  }

  static isSameStableNodePath(left: string, right: string): boolean {
    return PathUtil.toStableNodePath(left) === PathUtil.toStableNodePath(right);
  }

  static extractDirectory(path: string): string | null {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      return null;
    }
    return path.substring(0, lastSlash);
  }

  static extractFilename(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash === -1 ? path : path.substring(lastSlash + 1);
  }

  static isAbsolutePath(path: string): boolean {
    return path.startsWith('/');
  }
}
