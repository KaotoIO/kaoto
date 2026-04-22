import { PathExpression, PathSegment } from '../models/datamapper';
import { IDocument, IField } from '../models/datamapper/document';
import { DocumentUtilService } from './document/document-util.service';
import { ensureNamespaceRegistered, getPrefixForNamespaceURI } from './namespace-util';
import { XPathService } from './xpath/xpath.service';

export type SchemaPathSegment =
  | { kind: 'element'; segment: string }
  | { kind: 'choice'; index: number }
  | { kind: 'abstract'; index: number };

/**
 * Service for schema path string operations: parsing, building, and navigation.
 *
 * A schema path (e.g. `/ns0:Root/{choice:0}`) is a serializable path format mixing
 * XPath-style element segments, `{choice:N}` compositor indices, and `{abstract:N}`
 * abstract element wrapper indices. It is intentionally distinct from XPath to avoid
 * ambiguity with XPath predicates.
 *
 * `{choice:N}` represents the N-th `xs:choice` compositor among its siblings.
 * `{abstract:N}` represents the N-th abstract element wrapper among its siblings.
 * Both are synthetic nodes that have no counterpart in XPath or XSLT output — they
 * exist only in the schema/visual tree to hold candidate members for selection.
 *
 * Examples:
 * - `/ns0:Root/{choice:0}` — single choice under Root
 * - `/ns0:Root/{choice:0}` and `/ns0:Root/{choice:1}` — sibling choices
 * - `/ns0:Root/{choice:0}/ns0:Option1/{choice:0}` — choice nested via element
 * - `/ns0:Root/{choice:0}/{choice:0}` — choice directly nested in choice
 * - `/ns0:Root/{abstract:0}` — single abstract element wrapper under Root
 * - `/ns0:Root/{abstract:0}/ns0:Cat` — concrete candidate under abstract wrapper
 *
 * @see DocumentUtilService for choice/abstract selection processing and mutation
 * @see FieldOverrideService for high-level orchestration
 * @see IChoiceSelection holds schema path to persist choice selection into DataMapper Metadata
 */
export class SchemaPathService {
  private static readonly CHOICE_SEGMENT_REGEX = /^\{choice:(\d+)}$/;
  private static readonly ABSTRACT_SEGMENT_REGEX = /^\{abstract:(\d+)}$/;
  /**
   * Parses a schema path string into an array of typed segments.
   *
   * @param schemaPath - The schema path string (e.g. `/ns0:Root/{choice:0}`, `/ns0:Root/{abstract:0}`)
   * @returns Array of segments: `{ kind: 'element' }`, `{ kind: 'choice', index }`, or `{ kind: 'abstract', index }`
   */
  static parse(schemaPath: string): SchemaPathSegment[] {
    const parts = schemaPath.split('/').filter((p) => p.length > 0);
    const segments: SchemaPathSegment[] = [];
    for (const part of parts) {
      const choiceMatch = SchemaPathService.CHOICE_SEGMENT_REGEX.exec(part);
      if (choiceMatch) {
        segments.push({ kind: 'choice', index: Number.parseInt(choiceMatch[1], 10) });
        continue;
      }
      const abstractMatch = SchemaPathService.ABSTRACT_SEGMENT_REGEX.exec(part);
      if (abstractMatch) {
        segments.push({ kind: 'abstract', index: Number.parseInt(abstractMatch[1], 10) });
        continue;
      }
      segments.push({ kind: 'element', segment: part });
    }
    return segments;
  }

  /**
   * Builds a schema path string from a field and its ancestor chain.
   * Choice wrapper fields produce `{choice:N}` segments, abstract wrapper fields
   * produce `{abstract:N}` segments, and regular fields produce XPath-style element segments.
   *
   * @param field - The field to build the path for
   * @param namespaceMap - Namespace prefix to URI mapping for segment generation
   * @returns Schema path string (e.g. `/ns0:Root/{choice:0}`, `/ns0:Root/{abstract:0}`)
   */
  static build(field: IField, namespaceMap: Record<string, string>): string {
    const fieldStack = DocumentUtilService.getFieldStack(field, true).reverse();
    const segments: string[] = [];
    for (const f of fieldStack) {
      if (f.wrapperKind) {
        segments.push(
          `{${f.wrapperKind}:${SchemaPathService.getSiblingIndex(f, (sibling) => sibling.wrapperKind === f.wrapperKind)}}`,
        );
      } else {
        segments.push(SchemaPathService.buildElementSegment(f, namespaceMap));
      }
    }
    return '/' + segments.join('/');
  }

  /**
   * Builds a human-readable display path for use in the Field Override modal.
   *
   * Unlike {@link build}/{@link buildOriginal}, this path is for UI display only — not
   * for matching against persisted definitions. Choice wrappers emit `{choice:N}` segments.
   * Abstract wrappers are collapsed: when the next field in the stack is a child of the
   * wrapper, the wrapper segment is skipped; otherwise the selected candidate (via
   * `selectedMemberIndex`) replaces the wrapper segment.
   *
   * Note: mutates `namespaceMap` by registering prefixes for encountered namespace URIs.
   */
  static formatDisplayPath(field: IField, namespaceMap: Record<string, string>): string {
    const fieldStack = DocumentUtilService.getFieldStack(field, true).reverse();
    for (const f of fieldStack) {
      ensureNamespaceRegistered(f.namespaceURI, namespaceMap, f.namespacePrefix ?? undefined);
    }
    const segments: string[] = [];
    const lastIndex = fieldStack.length - 1;
    for (let i = 0; i <= lastIndex; i++) {
      const f = fieldStack[i];
      if (f.wrapperKind === 'choice') {
        segments.push(
          `{choice:${SchemaPathService.getSiblingIndex(f, (sibling) => sibling.wrapperKind === 'choice')}}`,
        );
      } else if (f.wrapperKind === 'abstract' && i < lastIndex) {
        i++;
        segments.push(SchemaPathService.buildElementSegment(fieldStack[i], namespaceMap));
      } else if (f.wrapperKind === 'abstract' && f.selectedMemberIndex !== undefined) {
        const selectedMember = f.fields?.[f.selectedMemberIndex];
        if (selectedMember) {
          ensureNamespaceRegistered(
            selectedMember.namespaceURI,
            namespaceMap,
            selectedMember.namespacePrefix ?? undefined,
          );
          segments.push(SchemaPathService.buildElementSegment(selectedMember, namespaceMap));
        } else {
          segments.push(SchemaPathService.buildElementSegment(f, namespaceMap));
        }
      } else {
        segments.push(SchemaPathService.buildElementSegment(f, namespaceMap));
      }
    }
    return '/' + segments.join('/');
  }

  private static getSiblingIndex(field: IField, getTestFlag: (sibling: IField) => boolean | undefined): number {
    let index = 0;
    for (const sibling of field.parent.fields) {
      if (sibling === field) break;
      if (getTestFlag(sibling)) index++;
    }
    return index;
  }

  private static buildElementSegment(field: IField, namespaceMap: Record<string, string>): string {
    const nsPrefix = getPrefixForNamespaceURI(field.namespaceURI, namespaceMap);
    const segment = new PathSegment(field.name, field.isAttribute, nsPrefix, field.predicates);
    const pathExpr = new PathExpression(undefined, true);
    pathExpr.pathSegments = [segment];
    return XPathService.toXPathString(pathExpr);
  }

  /**
   * Builds a schema path string using the field's original (pre-substitution) name for the terminal segment.
   * Falls back to {@link build} when the field has no `originalField`.
   *
   * @param field - The (possibly substituted) field to build the path for
   * @param namespaceMap - Namespace prefix to URI mapping for segment generation
   * @returns Schema path string using the original wire name for the terminal segment
   */
  static buildOriginal(field: IField, namespaceMap: Record<string, string>): string {
    if (!field.originalField) {
      return SchemaPathService.build(field, namespaceMap);
    }
    const fieldStack = DocumentUtilService.getFieldStack(field, true).reverse();
    const segments: string[] = [];
    const lastIndex = fieldStack.length - 1;
    for (let i = 0; i <= lastIndex; i++) {
      const f = fieldStack[i];
      if (i === lastIndex) {
        const origName = field.originalField.name;
        const origNsURI = field.originalField.namespaceURI;
        const nsPrefix = getPrefixForNamespaceURI(origNsURI, namespaceMap);
        const segment = new PathSegment(origName, f.isAttribute, nsPrefix, f.predicates);
        const pathExpr = new PathExpression(undefined, true);
        pathExpr.pathSegments = [segment];
        segments.push(XPathService.toXPathString(pathExpr));
      } else if (f.wrapperKind) {
        segments.push(
          `{${f.wrapperKind}:${SchemaPathService.getSiblingIndex(f, (sibling) => sibling.wrapperKind === f.wrapperKind)}}`,
        );
      } else {
        segments.push(SchemaPathService.buildElementSegment(f, namespaceMap));
      }
    }
    return '/' + segments.join('/');
  }

  /**
   * Navigates to any field in a document tree using a schema path.
   *
   * @param document - The document to navigate in
   * @param schemaPath - The schema path string identifying the field
   * @param namespaceMap - Namespace prefix to URI mapping for element segment resolution
   * @returns The field if found, undefined otherwise
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
      const found = SchemaPathService.resolveSegment(current, segment, namespaceMap);
      if (!found) return undefined;
      current = found;
    }

    if (!('parent' in current)) return undefined;
    return current;
  }

  private static resolveSegment(
    parent: IDocument | IField,
    segment: SchemaPathSegment,
    namespaceMap: Record<string, string>,
  ): IField | undefined {
    if (segment.kind === 'element') {
      return SchemaPathService.findElementChild(parent, segment.segment, namespaceMap);
    }
    const getTestFlag = (f: IField) => f.wrapperKind === segment.kind;
    return SchemaPathService.findIndexedChild(parent, segment.index, getTestFlag);
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

  private static findIndexedChild(
    parent: IDocument | IField,
    targetIndex: number,
    getTestFlag: (field: IField) => boolean | undefined,
  ): IField | undefined {
    if ('parent' in parent && parent.namedTypeFragmentRefs.length > 0) {
      DocumentUtilService.resolveTypeFragment(parent);
    }

    let count = 0;
    for (const field of parent.fields) {
      if (getTestFlag(field)) {
        if (count === targetIndex) return field;
        count++;
      }
    }

    return undefined;
  }
}
