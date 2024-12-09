export interface NamespaceContext {
  getNamespaceURI(var1: string): string;

  getPrefix(var1: string): string;

  getPrefixes(var1: string): string[];
}
