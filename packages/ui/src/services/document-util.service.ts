import { IDocument, IField, IParentType, ITypeFragment, PrimitiveDocument } from '../models/datamapper';

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
}
