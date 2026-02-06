import { PathSegment } from '../models/datamapper';
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
  RootElementOption,
} from '../models/datamapper/document';
import { IMetadataApi } from '../providers';
import { DocumentUtilService } from './document-util.service';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XPathService } from './xpath/xpath.service';

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

      return DocumentService.doCreateDocumentFromDefinition(documentDefinition);
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
    const doc = new PrimitiveDocument(definition);
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

  private static doCreateDocumentFromDefinition(definition: DocumentDefinition): CreateDocumentResult {
    switch (definition.definitionType) {
      case DocumentDefinitionType.Primitive: {
        const document = new PrimitiveDocument(definition);
        return {
          validationStatus: 'success',
          validationMessage: 'Schema validation successful',
          documentDefinition: definition,
          document,
          rootElementOptions: [],
        };
      }
      case DocumentDefinitionType.XML_SCHEMA:
        return XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      case DocumentDefinitionType.JSON_SCHEMA:
        return JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      default:
        return {
          validationStatus: 'error',
          validationMessage: `Unsupported definition type: ${definition.definitionType}`,
        };
    }
  }

  static updateRootElement(document: IDocument, rootElementOption: RootElementOption): IDocument {
    if (!(document instanceof XmlSchemaDocument)) return document;

    return XmlSchemaDocumentService.updateRootElement(document, rootElementOption);
  }

  static getRootElementQName(document?: IDocument) {
    if (!(document instanceof XmlSchemaDocument)) return null;
    return document.rootElement?.getQName();
  }

  static createInitialDocuments(initModel?: DocumentInitializationModel): InitialDocumentsSet | null {
    if (!initModel) return null;
    const answer: InitialDocumentsSet = {
      sourceParameterMap: new Map<string, IDocument>(),
    };
    if (initModel.sourceBody) {
      const result = DocumentService.doCreateDocumentFromDefinition(initModel.sourceBody);
      if (result.document) answer.sourceBodyDocument = result.document;
    }
    if (initModel.sourceParameters) {
      Object.entries(initModel.sourceParameters).forEach(([key, value]) => {
        const result = DocumentService.doCreateDocumentFromDefinition(value);
        answer.sourceParameterMap.set(key, result.document ?? new PrimitiveDocument(value));
      });
    }
    if (initModel.targetBody) {
      const result = DocumentService.doCreateDocumentFromDefinition(initModel.targetBody);
      if (result.document) answer.targetBodyDocument = result.document;
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
    // Attributes cannot have children in XML Schema
    if (field.isAttribute) return false;
    return field.fields.length > 0 || field.namedTypeFragmentRefs.length > 0;
  }

  static isCollectionField(field: IField) {
    return field.maxOccurs === 'unbounded' || Number(field.maxOccurs) > 1;
  }

  static renameDocument(document: IDocument, newDocumentId: string): void {
    document.documentId = newDocumentId;
    document.name = newDocumentId;
    if ('displayName' in document) {
      document.displayName = newDocumentId;
    }
    document.path.documentId = newDocumentId;
    DocumentService.renameFields(document, newDocumentId);
  }

  private static renameFields(parent: IParentType, parentPathSegment: string) {
    for (const field of parent.fields) {
      field.path.documentId = parentPathSegment;
      if ('ownerDocument' in field && field.ownerDocument.documentId !== parentPathSegment) {
        field.ownerDocument.documentId = parentPathSegment;
      }
      if (field.fields?.length > 0) {
        DocumentService.renameFields(field, parentPathSegment);
      }
    }
  }
}
