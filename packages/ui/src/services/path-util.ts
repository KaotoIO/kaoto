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
}
