import {
  BODY_DOCUMENT_ID,
  CreateDocumentResult,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
  IDocument,
  IField,
  IParentType,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { IMetadataApi } from '../providers';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { PathSegment } from '../models/datamapper';
import { XPathService } from './xpath/xpath.service';
import { DocumentUtilService } from './document-util.service';

interface InitialDocumentsSet {
  sourceBodyDocument?: IDocument;
  sourceParameterMap: Map<string, IDocument>;
  targetBodyDocument?: IDocument;
}

/**
 * The collection of the Document handling logic. In order to avoid circular dependency, the common routines
 * to be used by the format specific document services such as {@link XmlSchemaDocumentService} and
 * {@link JsonSchemaDocumentService} have been split into {@link DocumentUtilService}.
 *
 * @see DocumentUtilService
 * @see XmlSchemaDocumentService
 * @see JsonSchemaDocumentService
 * @see XPathService
 */
export class DocumentService {
  /**
   * Creates {@link DocumentDefinition} object and an appropriate implementation of {@link IDocument} object by
   * consuming metadata such as {@link DocumentType}, {@link DocumentDefinitionType} `Document ID` and schema files.
   * @see createPrimitiveDocument
   *
   * @param api
   * @param documentType
   * @param schemaType
   * @param documentId
   * @param schemaFilePaths
   */
  static async createDocument(
    api: IMetadataApi,
    documentType: DocumentType,
    schemaType: DocumentDefinitionType,
    documentId: string,
    schemaFilePaths: string[],
  ): Promise<CreateDocumentResult> {
    try {
      const docId = documentType === DocumentType.PARAM ? documentId : BODY_DOCUMENT_ID;
      const documentDefinition = await DocumentService.doCreateDocumentDefinition(
        api,
        documentType,
        schemaType,
        docId,
        schemaFilePaths,
      );
      if (!documentDefinition) {
        return { validationStatus: 'error', validationMessage: 'Could not read schema file(s)' };
      }

      const document = DocumentService.doCreateDocumentFromDefinition(documentDefinition);
      if (!document) {
        return { validationStatus: 'error', validationMessage: 'Could not create a document from schema file(s)' };
      }

      return {
        validationStatus: 'success',
        validationMessage: 'Schema validation successful',
        documentDefinition,
        document,
      };
      /* eslint-disable @typescript-eslint/no-explicit-any */
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown validation error';
      return { validationStatus: 'error', validationMessage: errorMessage };
    }
  }

  /**
   * Creates {@link DocumentDefinition} object and a {@link PrimitiveDocument} object.
   * @see createDocument
   *
   * @param documentType
   * @param schemaType
   * @param documentId
   */
  static createPrimitiveDocument(
    documentType: DocumentType,
    schemaType: DocumentDefinitionType,
    documentId: string,
  ): CreateDocumentResult {
    const definition = new DocumentDefinition(documentType, schemaType, documentId);
    const docId = documentType === DocumentType.PARAM ? definition.name! : BODY_DOCUMENT_ID;
    const doc = new PrimitiveDocument(definition.documentType, docId);
    return { validationStatus: 'success', documentDefinition: definition, document: doc };
  }

  private static async doCreateDocumentDefinition(
    api: IMetadataApi,
    documentType: DocumentType,
    definitionType: DocumentDefinitionType,
    documentId: string,
    schemaFilePaths: string[],
  ): Promise<DocumentDefinition | undefined> {
    if (!schemaFilePaths || schemaFilePaths.length === 0) return;
    const fileContents: Record<string, string> = {};
    const fileContentPromises: Promise<void>[] = [];
    schemaFilePaths.forEach((path: string) => {
      const promise = api.getResourceContent(path).then((content: string | undefined) => {
        if (content) fileContents[path] = content;
      });
      fileContentPromises.push(promise);
    });
    await Promise.allSettled(fileContentPromises);
    return new DocumentDefinition(documentType, definitionType, documentId, fileContents);
  }

  private static doCreateDocumentFromDefinition(definition: DocumentDefinition): IDocument | null {
    if (definition.definitionType === DocumentDefinitionType.Primitive) {
      return new PrimitiveDocument(definition.documentType, DocumentType.PARAM ? definition.name! : BODY_DOCUMENT_ID);
    }
    if (!definition.definitionFiles || Object.keys(definition.definitionFiles).length === 0) return null;
    const content = Object.values(definition.definitionFiles)[0];
    const documentId = definition.documentType === DocumentType.PARAM ? definition.name! : BODY_DOCUMENT_ID;
    switch (definition.definitionType) {
      case DocumentDefinitionType.XML_SCHEMA:
        return XmlSchemaDocumentService.createXmlSchemaDocument(definition.documentType, documentId, content);
      case DocumentDefinitionType.JSON_SCHEMA:
        return JsonSchemaDocumentService.createJsonSchemaDocument(definition.documentType, documentId, content);
      default:
        return null;
    }
  }

  static createInitialDocuments(initModel?: DocumentInitializationModel): InitialDocumentsSet | null {
    if (!initModel) return null;
    const answer: InitialDocumentsSet = {
      sourceParameterMap: new Map<string, IDocument>(),
    };
    if (initModel.sourceBody) {
      const document = DocumentService.doCreateDocumentFromDefinition(initModel.sourceBody);
      if (document) answer.sourceBodyDocument = document;
    }
    if (initModel.sourceParameters) {
      Object.entries(initModel.sourceParameters).forEach(([key, value]) => {
        const document = DocumentService.doCreateDocumentFromDefinition(value);
        answer.sourceParameterMap.set(key, document ? document : new PrimitiveDocument(DocumentType.PARAM, key));
      });
    }
    if (initModel.targetBody) {
      const document = DocumentService.doCreateDocumentFromDefinition(initModel.targetBody);
      if (document) answer.targetBodyDocument = document;
    }
    return answer;
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

  static getCompatibleField(document: IDocument, field: IField): IField | undefined {
    if (document instanceof PrimitiveDocument) return field instanceof PrimitiveDocument ? document : undefined;
    if (field instanceof PrimitiveDocument) return undefined;

    let left: IField | undefined = undefined;
    const fieldStack = DocumentUtilService.getFieldStack(field, true);
    for (const right of fieldStack.reverse()) {
      const parent: IParentType = left ? left : document;
      left = parent.fields.find((leftTest: IField) => {
        const isAttributeOrElementMatching = leftTest.isAttribute === right.isAttribute;
        const isNamespaceMatching =
          !leftTest.ownerDocument.isNamespaceAware ||
          !right.ownerDocument.isNamespaceAware ||
          leftTest.namespaceURI === right.namespaceURI;
        return isAttributeOrElementMatching && isNamespaceMatching && leftTest.name === right.name;
      });
      if (!left) return undefined;
    }
    return left;
  }

  static getFieldFromPathSegments(
    namespaces: { [p: string]: string },
    document: IDocument,
    pathSegments: PathSegment[],
  ) {
    let parent: IDocument | IField = document;

    for (const segment of pathSegments) {
      if (!segment) continue;
      const child: IField | undefined = parent.fields.find((f) => {
        const resolvedField = DocumentUtilService.resolveTypeFragment(f);
        return XPathService.matchSegment(namespaces, resolvedField, segment);
      });
      if (!child) {
        return undefined;
      }
      parent = child;
    }
    return parent;
  }

  static isNonPrimitiveField(parent: IParentType) {
    return parent && !('documentType' in parent);
  }

  static isRecursiveField(field: IField) {
    const name = field.name;
    const namespace = field.namespaceURI;
    const stack = DocumentUtilService.getFieldStack(field);
    return !!stack.find((f) => f.name === name && f.namespaceURI === namespace);
  }

  static hasFields(document: IDocument) {
    return !(document instanceof PrimitiveDocument) && document.fields.length > 0;
  }

  static hasChildren(field: IField) {
    return field.fields.length > 0 || field.namedTypeFragmentRefs.length > 0;
  }

  static isCollectionField(field: IField) {
    return !!field.maxOccurs && field.maxOccurs > 1;
  }
}
