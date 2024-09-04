import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  IDocument,
  IField,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { DocumentType } from '../models/datamapper/path';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { readFileAsString } from '../utils/read-file-as-string';

interface InitialDocumentsSet {
  sourceBodyDocument?: IDocument;
  sourceParameterMap: Map<string, IDocument>;
  targetBodyDocument?: IDocument;
}

export class DocumentService {
  static createDocument(definition: DocumentDefinition): Promise<IDocument | null> {
    if (definition.definitionType === DocumentDefinitionType.Primitive) {
      return Promise.resolve(
        new PrimitiveDocument(definition.documentType, DocumentType.PARAM ? definition.name! : BODY_DOCUMENT_ID),
      );
    }
    if (!definition.definitionFiles || definition.definitionFiles.length === 0) return Promise.resolve(null);
    return Promise.allSettled(
      definition.definitionFiles.map((file) =>
        typeof file === 'string' ? Promise.resolve(file) : readFileAsString(file),
      ),
    ).then((results) => {
      const content = (results[0] as PromiseFulfilledResult<string>).value;
      const documentId = definition.documentType === DocumentType.PARAM ? definition.name! : BODY_DOCUMENT_ID;
      return XmlSchemaDocumentService.createXmlSchemaDocument(definition.documentType, documentId, content);
    });
  }

  static createInitialDocuments(initModel?: DocumentInitializationModel): Promise<InitialDocumentsSet | null> {
    if (!initModel) return Promise.resolve(null);
    const answer: InitialDocumentsSet = {
      sourceParameterMap: new Map<string, IDocument>(),
    };
    const promises: Promise<void>[] = [];
    if (initModel.sourceBody) {
      const sourceBodyPromise = DocumentService.createDocument(initModel.sourceBody).then((document) => {
        if (document) answer.sourceBodyDocument = document;
      });
      promises.push(sourceBodyPromise);
    }
    if (initModel.sourceParameters) {
      Object.entries(initModel.sourceParameters).map(([key, value]) => {
        const paramPromise = DocumentService.createDocument(value).then((document) => {
          answer.sourceParameterMap.set(key, document ? document : new PrimitiveDocument(DocumentType.PARAM, key));
        });
        promises.push(paramPromise);
      });
    }
    if (initModel.targetBody) {
      const targetBodyPromise = DocumentService.createDocument(initModel.targetBody).then((document) => {
        if (document) answer.targetBodyDocument = document;
      });
      promises.push(targetBodyPromise);
    }
    return Promise.allSettled(promises).then(() => {
      return answer;
    });
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
}
