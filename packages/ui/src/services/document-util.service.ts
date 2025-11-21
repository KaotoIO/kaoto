import { IDocument, IField, IParentType, ITypeFragment, PrimitiveDocument } from '../models/datamapper';
import { IFieldTypeOverride } from '../models/datamapper/metadata';
import { TypeOverrideVariant, Types } from '../models/datamapper/types';
import { QName } from '../xml-schema-ts/QName';
import { XPathService } from './xpath/xpath.service';

type ParseTypeOverrideFn = (
  typeString: string,
  namespaceMap: Record<string, string>,
  field: IField,
) => { type: Types; typeQName: QName; variant: TypeOverrideVariant };

/**
 * The collection of utility functions shared among {@link DocumentService}, {@link XmlSchemaDocumentService}
 * and {@link JsonSchemaDocumentService} while avoiding circular dependency.
 *
 * @see DocumentService
 * @see XmlSchemaDocumentService
 * @see JsonSchemaDocumentService
 */
export class DocumentUtilService {
  static getOwnerDocument<DocumentType extends IDocument>(docOrField: IParentType): DocumentType {
    return ('ownerDocument' in docOrField ? docOrField.ownerDocument : docOrField) as DocumentType;
  }

  /**
   * Resolve type fragments from reference and populate into the document tree so that it could be expanded in the UI.
   *
   *  @TODO is it safe to change field type dynamically even on XML field? we might eventually need to readahead field type
   *  even for XML field just like JSON field does, see {@link JsonSchemaDocumentService.createJsonSchemaDocument}
   * @param field
   */
  static resolveTypeFragment(field: IField): IField {
    if (field.namedTypeFragmentRefs.length === 0) return field;
    const doc = DocumentUtilService.getOwnerDocument(field);
    field.namedTypeFragmentRefs.forEach((ref) => {
      const fragment = doc.namedTypeFragments[ref];
      DocumentUtilService.adoptTypeFragment(field, fragment);
    });
    field.namedTypeFragmentRefs = [];
    return field;
  }

  static adoptTypeFragment(field: IField, fragment: ITypeFragment) {
    const doc = DocumentUtilService.getOwnerDocument(field);
    if (fragment.type) field.type = fragment.type;
    if (fragment.minOccurs !== undefined) field.minOccurs = fragment.minOccurs;
    if (fragment.maxOccurs !== undefined) field.maxOccurs = fragment.maxOccurs;
    fragment.fields.forEach((f) => f.adopt(field));
    fragment.namedTypeFragmentRefs.forEach((childRef) => {
      const childFragment = doc.namedTypeFragments[childRef];
      DocumentUtilService.adoptTypeFragment(field, childFragment);
    });
  }

  static getFieldStack(field: IField, includeItself: boolean = false): IField[] {
    if (field instanceof PrimitiveDocument) return [];
    const fieldStack: IField[] = [];
    if (includeItself) fieldStack.push(field);
    for (let next = field.parent; 'parent' in next && next !== next.parent; next = next.parent) {
      fieldStack.push(next);
    }
    return fieldStack;
  }

  static applyFieldTypeOverrides(
    document: IDocument,
    overrides: IFieldTypeOverride[],
    namespaceMap: Record<string, string>,
    parseTypeOverride: ParseTypeOverrideFn,
  ): void {
    for (const override of overrides) {
      const field = DocumentUtilService.navigateToFieldByPath(document, override.path, namespaceMap);
      if (field) {
        DocumentUtilService.applyTypeOverrideToField(field, override.type, namespaceMap, parseTypeOverride);
      }
    }
  }

  private static navigateToFieldByPath(
    document: IDocument,
    xpathString: string,
    namespaceMap: Record<string, string>,
  ): IField | undefined {
    const pathExpressions = XPathService.extractFieldPaths(xpathString);
    if (pathExpressions.length === 0) {
      return undefined;
    }

    const pathExpression = pathExpressions[0];
    let current: IDocument | IField = document;

    for (const segment of pathExpression.pathSegments) {
      if (segment.isAttribute) {
        continue;
      }

      if ('parent' in current && current.namedTypeFragmentRefs.length > 0) {
        DocumentUtilService.resolveTypeFragment(current);
      }

      const childField: IField | undefined = current.fields.find((f) =>
        XPathService.matchSegment(namespaceMap, f, segment),
      );

      if (!childField) {
        return undefined;
      }

      current = childField;
    }

    return 'parent' in current ? current : undefined;
  }

  private static applyTypeOverrideToField(
    field: IField,
    typeString: string,
    namespaceMap: Record<string, string>,
    parseTypeOverride: ParseTypeOverrideFn,
  ): void {
    const { type, typeQName, variant } = parseTypeOverride(typeString, namespaceMap, field);

    field.type = type;
    field.typeQName = typeQName;
    field.typeOverride = variant;
    field.fields = [];

    if (type === Types.Container) {
      field.namedTypeFragmentRefs = [typeQName.toString()];
    } else {
      field.namedTypeFragmentRefs = [];
    }
  }
}
