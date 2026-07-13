/** Represents a single parsed node from a customInstructions string.
 *  nodeType is the opaque key name (defined in Epic 7). */
export interface CustomInstructionsNode {
  nodeType: string;
  rawContent: string;
}

/**
 * Parses and serializes the `customInstructions` field of a CustomMode.
 * Stub — Epic 7 replaces parse() and serialize() with real implementations.
 */
export class CustomInstructionsParser {
  /** Stub: always returns an empty array. */
  static parse(_raw: string): CustomInstructionsNode[] {
    // TODO: Epic 7 — implement real parsing
    return [];
  }

  /** Stub: always returns an empty string. */
  static serialize(_nodes: CustomInstructionsNode[]): string {
    // TODO: Epic 7 — implement real serialization
    return '';
  }
}
