import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  IDocument,
  IField,
  IParentType,
  ITypeFragment,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { DocumentType } from '../models/datamapper/path';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { IMetadataApi } from '../providers';

interface InitialDocumentsSet {
  sourceBodyDocument?: IDocument;
  sourceParameterMap: Map<string, IDocument>;
  targetBodyDocument?: IDocument;
}

export class DocumentService {
  static async createDocumentDefinition(
    api: IMetadataApi,
    documentType: DocumentType,
    definitionType: DocumentDefinitionType,
    documentId: string,
    schemaFilePaths: string[],
  ): Promise<DocumentDefinition | undefined> {
    if (!schemaFilePaths || schemaFilePaths.length === 0) return;
    const fileContents: Record<string, string> = {};
    const fileContentPromises: Promise<void>[] = [];
    schemaFilePaths.map((path: string) => {
      const promise = api.getResourceContent(path).then((content: string | undefined) => {
        if (content) fileContents[path] = content;
      });
      fileContentPromises.push(promise);
    });
    await Promise.allSettled(fileContentPromises);
    return new DocumentDefinition(documentType, definitionType, documentId, fileContents);
  }

  static createDocument(definition: DocumentDefinition): IDocument | null {
    if (definition.definitionType === DocumentDefinitionType.Primitive) {
      return new PrimitiveDocument(definition.documentType, DocumentType.PARAM ? definition.name! : BODY_DOCUMENT_ID);
    }
    if (!definition.definitionFiles || Object.keys(definition.definitionFiles).length === 0) return null;
    const content = Object.values(definition.definitionFiles)[0];
    const documentId = definition.documentType === DocumentType.PARAM ? definition.name! : BODY_DOCUMENT_ID;
    return XmlSchemaDocumentService.createXmlSchemaDocument(definition.documentType, documentId, content);
  }

  static createInitialDocuments(initModel?: DocumentInitializationModel): InitialDocumentsSet | null {
    if (!initModel) return null;
    const answer: InitialDocumentsSet = {
      sourceParameterMap: new Map<string, IDocument>(),
    };
    if (initModel.sourceBody) {
      const document = DocumentService.createDocument(initModel.sourceBody);
      if (document) answer.sourceBodyDocument = document;
    }
    if (initModel.sourceParameters) {
      Object.entries(initModel.sourceParameters).map(([key, value]) => {
        const document = DocumentService.createDocument(value);
        answer.sourceParameterMap.set(key, document ? document : new PrimitiveDocument(DocumentType.PARAM, key));
      });
    }
    if (initModel.targetBody) {
      const document = DocumentService.createDocument(initModel.targetBody);
      if (document) answer.targetBodyDocument = document;
    }
    return answer;
  }

  static getFieldStack(field: IField, includeItself: boolean = false) {
    if (field instanceof PrimitiveDocument) return [];
    const fieldStack: IField[] = [];
    if (includeItself) fieldStack.push(field);
    for (let next = field.parent; 'parent' in next && next !== next.parent; next = (next as IField).parent) {
      fieldStack.push(next);
    }
    return fieldStack;
  }

  static hasField(document: IDocument, field: IField) {
    if (
      document.documentType !== field.ownerDocument.documentType ||
      document.documentId !== field.ownerDocument.documentId
    )
      return false;
    if (document instanceof PrimitiveDocument && document === field) return true;

    return DocumentService.isDescendant(document, field);
  }

  static isDescendant(parent: IField | IDocument, child: IField): boolean {
    return !!parent.fields.find((f) => f === child || DocumentService.isDescendant(f, child));
  }

  static getFieldFromPathSegments(document: IDocument, pathSegments: string[]) {
    let parent: IDocument | IField = document;
    for (const segment of pathSegments) {
      if (!segment) continue;
      const child: IField | undefined = parent.fields.find((f) => DocumentService.getFieldExpression(f) === segment);
      if (!child) {
        return undefined;
      }
      parent = child;
    }
    return parent;
  }

  static getFieldFromPathExpression(document: IDocument, pathExpression: string) {
    return DocumentService.getFieldFromPathSegments(document, pathExpression.split('/'));
  }

  static getFieldExpression(field: IField) {
    return field.isAttribute ? `@${field.name}` : field.name;
  }

  static getFieldExpressionNS(field: IField, namespaceMap: { [prefix: string]: string }) {
    let answer = field.isAttribute ? '@' : '';
    const nsPair =
      field.namespaceURI &&
      Object.entries(namespaceMap).find(([prefix, uri]) => prefix && uri && field.namespaceURI === uri);
    if (nsPair) answer += nsPair[0] + ':';
    return answer + field.name;
  }

  static getOwnerDocument<DocumentType extends IDocument>(docOrField: IParentType): DocumentType {
    return ('ownerDocument' in docOrField ? docOrField.ownerDocument : docOrField) as DocumentType;
  }

  static resolveTypeFragment(field: IField) {
    if (field.namedTypeFragmentRefs.length === 0) return field;
    const doc = DocumentService.getOwnerDocument(field);
    field.namedTypeFragmentRefs.forEach((ref) => {
      const fragment = doc.namedTypeFragments[ref];
      DocumentService.adoptTypeFragment(field, fragment);
    });
    field.namedTypeFragmentRefs = [];
    return field;
  }

  private static adoptTypeFragment(field: IField, fragment: ITypeFragment) {
    const doc = DocumentService.getOwnerDocument(field);
    fragment.fields.forEach((f) => f.adopt(field));
    fragment.namedTypeFragmentRefs.forEach((childRef) => {
      const childFragment = doc.namedTypeFragments[childRef];
      DocumentService.adoptTypeFragment(field, childFragment);
    });
  }

  static isNonPrimitiveField(parent: IParentType) {
    return parent && !('documentType' in parent);
  }
}
