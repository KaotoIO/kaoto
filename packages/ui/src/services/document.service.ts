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
  PathSegment,
  PrimitiveDocument,
  RootElementOption,
} from '../models/datamapper';
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
        return { validationStatus: 'error', errors: [{ message: 'Could not read schema file(s)' }] };
      }

      return DocumentService.doCreateDocumentFromDefinition(documentDefinition);
      /* eslint-disable @typescript-eslint/no-explicit-any */
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown validation error';
      return { validationStatus: 'error', errors: [{ message: errorMessage }] };
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
          errors: [{ message: `Unsupported definition type: ${definition.definitionType}` }],
        };
    }
  }

  /**
   * Removes a schema file from the definition and re-creates the document with updated analysis.
   * Delegates to {@link XmlSchemaDocumentService.removeSchemaFile} or
   * {@link JsonSchemaDocumentService.removeSchemaFile} based on the definition type.
   *
   * @param definition - The current document definition containing schema files
   * @param filePath - The key of the schema file to remove from {@link DocumentDefinition.definitionFiles}
   * @returns A {@link CreateDocumentResult} with updated validation status, errors/warnings, and definition
   */
  static removeSchemaFile(definition: DocumentDefinition, filePath: string): CreateDocumentResult {
    switch (definition.definitionType) {
      case DocumentDefinitionType.XML_SCHEMA:
        return XmlSchemaDocumentService.removeSchemaFile(definition, filePath);
      case DocumentDefinitionType.JSON_SCHEMA:
        return JsonSchemaDocumentService.removeSchemaFile(definition, filePath);
      default:
        return {
          validationStatus: 'error',
          errors: [{ message: `removeSchemaFile is not supported for definition type: ${definition.definitionType}` }],
        };
    }
  }

  /**
   * Updates the root element of an {@link XmlSchemaDocument}.
   * Non-XML schema documents are returned unchanged.
   * @param document - The document to update
   * @param rootElementOption - The new root element to use
   * @returns The updated document
   */
  static updateRootElement(document: IDocument, rootElementOption: RootElementOption): IDocument {
    if (!(document instanceof XmlSchemaDocument)) return document;

    return XmlSchemaDocumentService.updateRootElement(document, rootElementOption);
  }

  /**
   * Returns the qualified name of the root element for an {@link XmlSchemaDocument}.
   * Returns null for non-XML schema documents.
   * @param document - The document to inspect
   * @returns The root element QName, or null if not applicable
   */
  static getRootElementQName(document?: IDocument) {
    if (!(document instanceof XmlSchemaDocument)) return null;
    return document.rootElement?.getQName();
  }

  /**
   * Creates the initial set of source and target documents from a {@link DocumentInitializationModel}.
   * @param initModel - The initialization model containing document definitions
   * @returns An object containing the source body document, source parameter map, and target body document; or null if no model is provided
   */
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

  /**
   * Checks whether a field belongs to the given document.
   * Verifies document type and document ID before searching descendants.
   * @param document - The document to check
   * @param field - The field to locate
   * @returns true if the field belongs to the document, false otherwise
   */
  static hasField(document: IDocument, field: IField) {
    if (
      document.documentType !== field.ownerDocument.documentType ||
      document.documentId !== field.ownerDocument.documentId
    )
      return false;
    if (document instanceof PrimitiveDocument && document === field) return true;

    return DocumentService.isDescendant(document, field);
  }

  /**
   * Checks whether a field is a descendant of the given parent field or document.
   * Recurses through child fields and choice members.
   * @param parent - The parent field or document to search within
   * @param child - The field to look for
   * @returns true if child is a descendant of parent, false otherwise
   */
  static isDescendant(parent: IField | IDocument, child: IField): boolean {
    for (const f of parent.fields) {
      if (f === child || DocumentService.isDescendant(f, child)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Finds the field in the given document that corresponds to the given field from another document.
   * Navigates by matching name, namespace, and isAttribute along the field's ancestor stack.
   * @param document - The document to search in
   * @param field - The field from another document to match against
   * @returns The compatible field if found, undefined otherwise
   */
  static getCompatibleField(document: IDocument, field: IField): IField | undefined {
    if (document instanceof PrimitiveDocument) return field instanceof PrimitiveDocument ? document : undefined;
    if (field instanceof PrimitiveDocument) return undefined;

    let left: IField | undefined = undefined;
    const fieldStack = DocumentUtilService.getFieldStack(field, true);
    for (const right of fieldStack.slice().reverse()) {
      const parent: IParentType = left ?? document;
      if (right.isChoice) {
        const rightChoices: IField[] = right.parent.fields.filter((f) => f.isChoice);
        const leftChoices: IField[] = parent.fields.filter((f) => f.isChoice);
        const choiceIndex: number = rightChoices.indexOf(right);
        const choiceFound: IField | undefined = choiceIndex >= 0 ? leftChoices[choiceIndex] : undefined;
        if (!choiceFound) return undefined;
        left = choiceFound;
        continue;
      }
      const found = DocumentService.findCompatibleFieldInParent(parent, right);
      if (!found) return undefined;
      left = found;
    }
    return left;
  }

  private static findCompatibleFieldInParent(parent: IParentType, right: IField): IField | undefined {
    const directChild = parent.fields.find((leftTest: IField) => {
      const isAttributeOrElementMatching = leftTest.isAttribute === right.isAttribute;
      const isNamespaceMatching =
        !leftTest.ownerDocument.isNamespaceAware ||
        !right.ownerDocument.isNamespaceAware ||
        leftTest.namespaceURI === right.namespaceURI;
      return isAttributeOrElementMatching && isNamespaceMatching && leftTest.name === right.name;
    });
    if (directChild) return directChild;

    for (const parentField of parent.fields) {
      if (parentField.isChoice) {
        const found = DocumentService.findCompatibleFieldInChoice(parentField, right);
        if (found) return found;
      }
    }
    return undefined;
  }

  private static findCompatibleFieldInChoice(choiceField: IField, target: IField): IField | undefined {
    for (const member of choiceField.fields) {
      const isAttributeOrElementMatching = member.isAttribute === target.isAttribute;
      const isNamespaceMatching =
        !member.ownerDocument.isNamespaceAware ||
        !target.ownerDocument.isNamespaceAware ||
        member.namespaceURI === target.namespaceURI;
      if (isAttributeOrElementMatching && isNamespaceMatching && member.name === target.name) {
        return member;
      }
      if (member.isChoice) {
        const nested = this.findCompatibleFieldInChoice(member, target);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  /**
   * Navigates the document tree using XPath path segments and returns the field at the path.
   * @param namespaces - Namespace prefix to URI mapping for XPath resolution
   * @param document - The document to navigate within
   * @param pathSegments - Ordered array of path segments from root to target field
   * @returns The field at the specified path, or undefined if not found
   */
  static getFieldFromPathSegments(
    namespaces: { [p: string]: string },
    document: IDocument,
    pathSegments: PathSegment[],
  ) {
    let parent: IDocument | IField = document;

    for (const segment of pathSegments) {
      if (!segment) continue;

      const found = DocumentService.findFieldBySegmentInParent(parent, namespaces, segment);
      if (!found) {
        return undefined;
      }
      parent = found;
    }
    return parent;
  }

  private static findFieldBySegmentInParent(
    parent: IDocument | IField,
    namespaces: { [p: string]: string },
    segment: PathSegment,
  ): IField | undefined {
    const directChild = parent.fields.find((f) => {
      const resolvedField = DocumentUtilService.resolveTypeFragment(f);
      return XPathService.matchSegment(namespaces, resolvedField, segment);
    });
    if (directChild) return directChild;

    for (const field of parent.fields) {
      if (field.isChoice) {
        const found = DocumentService.findFieldInChoiceBySegment(namespaces, field, segment);
        if (found) return found;
      }
    }
    return undefined;
  }

  private static findFieldInChoiceBySegment(
    namespaces: { [p: string]: string },
    choiceField: IField,
    segment: PathSegment,
  ): IField | undefined {
    for (const member of choiceField.fields) {
      const resolvedField = DocumentUtilService.resolveTypeFragment(member);
      if (XPathService.matchSegment(namespaces, resolvedField, segment)) {
        return member;
      }
      if (member.isChoice) {
        const nested = this.findFieldInChoiceBySegment(namespaces, member, segment);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  /**
   * Returns true if the given parent is a field rather than a document.
   * @param parent - The parent field or document to inspect
   * @returns true if parent is a field, false if it is a document
   */
  static isNonPrimitiveField(parent: IParentType) {
    return parent && !('documentType' in parent);
  }

  /**
   * Checks whether a field is recursive, i.e. its type also appears in its ancestor chain.
   * @param field - The field to check
   * @returns true if the field is recursive, false otherwise
   */
  static isRecursiveField(field: IField) {
    const name = field.name;
    const namespace = field.namespaceURI;
    const stack = DocumentUtilService.getFieldStack(field);
    return stack.some((f) => f.name === name && f.namespaceURI === namespace);
  }

  /**
   * Returns true if the document is not a primitive document and has at least one field.
   * @param document - The document to inspect
   * @returns true if the document has fields, false otherwise
   */
  static hasFields(document: IDocument) {
    return !(document instanceof PrimitiveDocument) && document.fields.length > 0;
  }

  /**
   * Returns true if the field can have child fields.
   * Attributes are never considered to have children in XML Schema.
   * @param field - The field to inspect
   * @returns true if the field has or can have children, false otherwise
   */
  static hasChildren(field: IField) {
    // Attributes cannot have children in XML Schema
    if (field.isAttribute) return false;
    return field.fields.length > 0 || field.namedTypeFragmentRefs.length > 0;
  }

  /**
   * Returns true if the field represents a collection (maxOccurs is 'unbounded' or greater than 1).
   * @param field - The field to inspect
   * @returns true if the field is a collection, false otherwise
   */
  static isCollectionField(field: IField) {
    return field.maxOccurs === 'unbounded' || Number(field.maxOccurs) > 1;
  }

  /**
   * Renames a document and updates all nested field paths to reflect the new document ID.
   * Modifies the document and its fields in place.
   * @param document - The document to rename
   * @param newDocumentId - The new document ID to assign
   */
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
