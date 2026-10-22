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

  /**
   * Computes the path of `toFile` relative to the directory containing `fromFile`.
   * Both inputs are normalized with {@link PathUtil.normalizePath}; `/` is the only supported separator.
   *
   * @example PathUtil.relativePath('a/b/wrapper.xsd', 'a/c/root.xsd') // '../c/root.xsd'
   */
  static relativePath(fromFile: string, toFile: string): string {
    const fromDirParts = PathUtil.normalizePath(fromFile).split('/').slice(0, -1);
    const toParts = PathUtil.normalizePath(toFile).split('/');

    let common = 0;
    while (common < fromDirParts.length && common < toParts.length - 1 && fromDirParts[common] === toParts[common]) {
      common++;
    }

    const ups = new Array<string>(fromDirParts.length - common).fill('..');
    return [...ups, ...toParts.slice(common)].join('/');
  }
}
