import { CollectionURIResolver } from './CollectionURIResolver';

export class DefaultURIResolver implements CollectionURIResolver {
  private collectionBaseUri?: string;
  private definitionFiles?: Record<string, string>;

  constructor(definitionFiles?: Record<string, string>) {
    this.definitionFiles = definitionFiles;
  }

  getCollectionBaseURI(): string | undefined {
    return this.collectionBaseUri;
  }

  setCollectionBaseURI(uri: string): void {
    this.collectionBaseUri = uri;
  }

  addFiles(newFiles: Record<string, string>): void {
    this.definitionFiles ??= {};
    Object.assign(this.definitionFiles, newFiles);
  }

  resolveEntity(targetNamespace: string | null, schemaLocation: string, baseUri: string | null): string {
    if (this.definitionFiles) {
      return this.resolveFromFileMap(targetNamespace, schemaLocation, baseUri);
    }

    throw new Error(
      `XML schema External entity resolution is not yet supported: [namespace:${targetNamespace}, schemaLocation:${schemaLocation}, baseUri:${baseUri}]`,
    );
  }

  private resolveFromFileMap(targetNamespace: string | null, schemaLocation: string, baseUri: string | null): string {
    if (this.definitionFiles![schemaLocation]) {
      return this.definitionFiles![schemaLocation];
    }

    if (baseUri) {
      const resolvedPath = this.resolvePath(schemaLocation, baseUri);
      if (this.definitionFiles![resolvedPath]) {
        return this.definitionFiles![resolvedPath];
      }
    }

    const normalizedPath = this.normalizePath(schemaLocation);
    if (normalizedPath !== schemaLocation && this.definitionFiles![normalizedPath]) {
      return this.definitionFiles![normalizedPath];
    }

    const filename = this.extractFilename(schemaLocation);
    const matchByFilename = this.findByFilename(filename);
    if (matchByFilename) {
      return matchByFilename;
    }

    const availableFiles = Object.keys(this.definitionFiles!).join(', ');
    throw new Error(
      `Schema not found: schemaLocation="${schemaLocation}", ` +
        `targetNamespace="${targetNamespace}", baseUri="${baseUri}". ` +
        `Available files: [${availableFiles}]`,
    );
  }

  private resolvePath(schemaLocation: string, baseUri: string): string {
    if (this.isAbsolutePath(schemaLocation)) {
      return schemaLocation;
    }

    const baseDir = this.extractDirectory(baseUri);
    if (!baseDir) {
      return schemaLocation;
    }

    const combined = `${baseDir}/${schemaLocation}`;
    return this.normalizePath(combined);
  }

  private normalizePath(path: string): string {
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

  private extractDirectory(path: string): string | null {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      return null;
    }
    return path.substring(0, lastSlash);
  }

  private extractFilename(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash === -1 ? path : path.substring(lastSlash + 1);
  }

  private findByFilename(filename: string): string | null {
    const matches: string[] = [];

    for (const [path, content] of Object.entries(this.definitionFiles!)) {
      if (this.extractFilename(path) === filename) {
        matches.push(content);
      }
    }

    if (matches.length === 0) {
      return null;
    }

    if (matches.length > 1) {
      throw new Error(
        `Ambiguous filename match for "${filename}". ` + `Multiple files with this name found in definitionFiles.`,
      );
    }

    return matches[0];
  }

  private isAbsolutePath(path: string): boolean {
    return path.startsWith('/');
  }
}
