import { IDocument, IField } from '../models/datamapper/document';
import { DocumentUtilService } from './document-util.service';
import { XPathService } from './xpath/xpath.service';

export type SchemaPathSegment = { kind: 'element'; segment: string } | { kind: 'choice'; index: number };

/**
 * Service for schema path string operations: parsing, building, and navigation.
 *
 * A schema path (e.g. `/ns0:Root/{choice:0}`) is a serializable path format mixing
 * XPath-style element segments and `{choice:N}` compositor indices. It is intentionally
 * distinct from XPath to avoid ambiguity with XPath predicates.
 *
 * Examples:
 * - `/ns0:Root/{choice:0}` — single choice under Root
 * - `/ns0:Root/{choice:0}` and `/ns0:Root/{choice:1}` — sibling choices
 * - `/ns0:Root/{choice:0}/ns0:Option1/{choice:0}` — choice nested via element
 * - `/ns0:Root/{choice:0}/{choice:0}` — choice directly nested in choice
 *
 * @see DocumentUtilService for choice selection processing and mutation
 * @see FieldTypeOverrideService for high-level orchestration
 * @see IChoiceSelection holds schema path to persist choice selection into DataMapper Metadata
 */
export class SchemaPathService {
  /**
   * Parses a schema path string into an array of typed segments.
   *
   * @param schemaPath - The schema path string (e.g. `/ns0:Root/{choice:0}`)
   * @returns Array of segments, each either `{ kind: 'element', segment }` or `{ kind: 'choice', index }`
   */
  static parse(schemaPath: string): SchemaPathSegment[] {
    const parts = schemaPath.split('/').filter((p) => p.length > 0);
    const segments: SchemaPathSegment[] = [];
    for (const part of parts) {
      const choiceMatch = /^\{choice:(\d+)}$/.exec(part);
      if (choiceMatch) {
        segments.push({ kind: 'choice', index: Number.parseInt(choiceMatch[1], 10) });
      } else {
        segments.push({ kind: 'element', segment: part });
      }
    }
    return segments;
  }

  /**
   * Builds a schema path string from a choice compositor field and its ancestor chain.
   *
   * @param field - The choice compositor field to build the path for
   * @param namespaceMap - Namespace prefix to URI mapping for segment generation
   * @returns Schema path string (e.g. `/ns0:Root/{choice:0}`)
   */
  static build(field: IField, namespaceMap: Record<string, string>): string {
    const fieldStack = DocumentUtilService.getFieldStack(field, true).reverse();
    const segments: string[] = [];
    for (const f of fieldStack) {
      segments.push(
        f.isChoice
          ? `{choice:${SchemaPathService.getChoiceSiblingIndex(f)}}`
          : SchemaPathService.buildElementSegment(f, namespaceMap),
      );
    }
    return '/' + segments.join('/');
  }

  private static getChoiceSiblingIndex(field: IField): number {
    let index = 0;
    for (const sibling of field.parent.fields) {
      if (sibling === field) break;
      if (sibling.isChoice) index++;
    }
    return index;
  }

  private static buildElementSegment(field: IField, namespaceMap: Record<string, string>): string {
    const nsEntry = Object.entries(namespaceMap).find(([, uri]) => field.namespaceURI === uri);
    const nsPrefix = nsEntry ? nsEntry[0] : '';
    return nsPrefix ? `${nsPrefix}:${field.name}` : field.name;
  }

  /**
   * Navigates to a choice compositor field in a document tree using a schema path.
   *
   * @param document - The document to navigate in
   * @param schemaPath - The schema path string identifying the choice field
   * @param namespaceMap - Namespace prefix to URI mapping for element segment resolution
   * @returns The choice field if found, undefined otherwise
   */
  static navigateToField(
    document: IDocument,
    schemaPath: string,
    namespaceMap: Record<string, string>,
  ): IField | undefined {
    const segments = SchemaPathService.parse(schemaPath);
    if (segments.length === 0) return undefined;

    let current: IDocument | IField = document;

    for (const segment of segments) {
      if (segment.kind === 'element') {
        const found = SchemaPathService.findElementChild(current, segment.segment, namespaceMap);
        if (!found) return undefined;
        current = found;
      } else {
        const found = SchemaPathService.findChoiceChildByIndex(current, segment.index);
        if (!found) return undefined;
        current = found;
      }
    }

    if (!('parent' in current)) return undefined;
    return current.isChoice ? current : undefined;
  }

  private static findElementChild(
    parent: IDocument | IField,
    elementSegment: string,
    namespaceMap: Record<string, string>,
  ): IField | undefined {
    if ('parent' in parent && parent.namedTypeFragmentRefs.length > 0) {
      DocumentUtilService.resolveTypeFragment(parent);
    }

    const pathExpressions = XPathService.extractFieldPaths(`/${elementSegment}`);
    if (pathExpressions.length === 0 || pathExpressions[0].pathSegments.length === 0) return undefined;

    const segment = pathExpressions[0].pathSegments[0];

    return parent.fields.find((f) => XPathService.matchSegment(namespaceMap, f, segment));
  }

  private static findChoiceChildByIndex(parent: IDocument | IField, choiceIndex: number): IField | undefined {
    if ('parent' in parent && parent.namedTypeFragmentRefs.length > 0) {
      DocumentUtilService.resolveTypeFragment(parent);
    }

    let count = 0;
    for (const field of parent.fields) {
      if (field.isChoice) {
        if (count === choiceIndex) return field;
        count++;
      }
    }

    return undefined;
  }
}
