import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
} from '../models/datamapper';
import {
  IChoiceSelection,
  IDataMapperMetadata,
  IDocumentMetadata,
  IFieldTypeOverride,
} from '../models/datamapper/metadata';
import { IMetadataApi } from '../providers';
import { EMPTY_XSL } from './mapping-serializer.service';

/**
 * Service for managing DataMapper metadata  {@link IDataMapperMetadata} stored in the .kaoto file.
 * Handles creation, loading, updating, and persistence of DataMapper metadata including
 * document definitions, XSLT transformations, and field type overrides.
 */
export class DataMapperMetadataService {
  /**
   * Creates new DataMapper metadata with default values.
   * @param xsltPath Optional path to the XSLT transformation file
   * @returns New metadata object with initialized values
   */
  static createMetadata(xsltPath: string = ''): IDataMapperMetadata {
    return {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
      xsltPath,
      namespaceMap: {},
    };
  }

  /**
   * Clones existing metadata with a new XSLT path.
   * @param originalMetadata The metadata to clone
   * @param newXsltPath The new XSLT file path
   * @returns Cloned metadata with the new XSLT path
   */
  static cloneMetadata(originalMetadata: IDataMapperMetadata, newXsltPath: string): IDataMapperMetadata {
    return {
      sourceBody: originalMetadata.sourceBody,
      sourceParameters: originalMetadata.sourceParameters,
      targetBody: originalMetadata.targetBody,
      xsltPath: newXsltPath,
      namespaceMap: originalMetadata.namespaceMap,
    };
  }

  /**
   * Duplicates an XSLT file to a new path.
   * @param api The metadata API
   * @param originalMetadata The metadata containing the original XSLT path
   * @param newXsltPath The path for the duplicated XSLT file
   */
  static async duplicateXsltFile(
    api: IMetadataApi,
    originalMetadata: IDataMapperMetadata,
    newXsltPath: string,
  ): Promise<void> {
    const originalXsltContent = await api.getResourceContent(originalMetadata.xsltPath);
    if (originalXsltContent) {
      await api.saveResourceContent(newXsltPath, originalXsltContent);
    }
  }

  /**
   * Initializes DataMapper metadata and persist.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param xsltPath The XSLT file path
   * @returns The initialized metadata
   */
  static async initializeDataMapperMetadata(
    api: IMetadataApi,
    metadataId: string,
    xsltPath: string,
  ): Promise<IDataMapperMetadata> {
    const metadata = this.createMetadata(xsltPath);
    const metadataPromise = api.setMetadata(metadataId, metadata);
    const contentPromise = api.saveResourceContent(metadata.xsltPath, EMPTY_XSL);
    await Promise.allSettled([metadataPromise, contentPromise]);

    return metadata;
  }

  /**
   * Loads document definitions from metadata.
   * @param api The metadata API
   * @param metadata The DataMapper metadata
   * @returns Promise resolving to document initialization model with loaded documents
   */
  static loadDocuments(api: IMetadataApi, metadata: IDataMapperMetadata): Promise<DocumentInitializationModel> {
    return new Promise((resolve) => {
      const answer = new DocumentInitializationModel();
      const namespaceMap = metadata.namespaceMap || {};
      if (Object.keys(namespaceMap).length > 0) {
        answer.namespaceMap = namespaceMap;
      }
      const sourceBodyPromise = DataMapperMetadataService.doLoadDocument(
        api,
        DocumentType.SOURCE_BODY,
        BODY_DOCUMENT_ID,
        metadata.sourceBody,
        namespaceMap,
      ).then((definition) => (answer.sourceBody = definition));
      const targetBodyPromise = DataMapperMetadataService.doLoadDocument(
        api,
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        metadata.targetBody,
        namespaceMap,
      ).then((definition) => (answer.targetBody = definition));
      const paramPromises = Object.entries(metadata.sourceParameters).reduce(
        (acc, [key, meta]) => {
          acc[key] = DataMapperMetadataService.doLoadDocument(api, DocumentType.PARAM, key, meta, namespaceMap).then(
            (definition) => (answer.sourceParameters[key] = definition),
          );
          return acc;
        },
        {} as Record<string, Promise<DocumentDefinition>>,
      );
      Promise.allSettled([sourceBodyPromise, targetBodyPromise, ...Object.values(paramPromises)]).then(() => {
        resolve(answer);
      });
    });
  }

  private static doLoadDocument(
    api: IMetadataApi,
    documentType: DocumentType,
    name: string,
    documentMetadata: IDocumentMetadata,
    namespaceMap: Record<string, string>,
  ): Promise<DocumentDefinition> {
    return new Promise((resolve) => {
      const definitionType = documentMetadata.type ? documentMetadata.type : DocumentDefinitionType.Primitive;
      const definitionFiles: Record<string, string> = {};
      const fileReadingPromises = documentMetadata.filePath
        ? documentMetadata.filePath.map((path) =>
            api
              .getResourceContent(path)
              .then((value) => {
                if (value) definitionFiles[path] = value;
              })
              .catch((error) => console.log(`Could not read a file "${path}": ${error}`)),
          )
        : [];
      Promise.allSettled(fileReadingPromises).then(() => {
        const answer = new DocumentDefinition(
          documentType,
          definitionType,
          name,
          definitionFiles,
          documentMetadata.rootElementChoice,
          documentMetadata.fieldTypeOverrides,
          documentMetadata.choiceSelections,
          namespaceMap,
        );
        resolve(answer);
      });
    });
  }

  /**
   * Loads the XSLT mapping file content from metadata.
   * @param api The metadata API
   * @param metadata The DataMapper metadata
   * @returns Promise resolving to the XSLT file content or undefined if not found
   */
  static loadMappingFile(api: IMetadataApi, metadata: IDataMapperMetadata): Promise<string | undefined> {
    return api.getResourceContent(metadata.xsltPath);
  }

  /**
   * Updates the source body metadata with a new document definition.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata to update
   * @param definition The new document definition
   */
  static async updateSourceBodyMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    definition: DocumentDefinition,
  ) {
    metadata.sourceBody = await DataMapperMetadataService.doCreateDocumentMetadata(
      api,
      metadataId,
      metadata,
      definition,
    );
    api.setMetadata(metadataId, metadata);
  }

  private static doCreateDocumentMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    definition: DocumentDefinition,
    existingMetadata?: IDocumentMetadata,
  ): Promise<IDocumentMetadata> {
    const filePaths = definition.definitionFiles ? Object.keys(definition.definitionFiles) : [];
    const answer: IDocumentMetadata = {
      type: definition.definitionType,
      filePath: filePaths,
      rootElementChoice: definition.rootElementChoice,
      fieldTypeOverrides: existingMetadata?.fieldTypeOverrides || [],
      choiceSelections: existingMetadata?.choiceSelections,
    };
    const metadataPromise = api.setMetadata(metadataId, metadata);
    const filePromises =
      api.shouldSaveSchema && definition.definitionFiles
        ? Object.entries(definition.definitionFiles).map(([path, content]) => {
            return api
              .saveResourceContent(path, content)
              .catch((error) => console.log(`Could not save a file "${path}": ${error}`));
          })
        : [];
    return new Promise((resolve) => {
      Promise.allSettled([metadataPromise, ...filePromises]).then(() => resolve(answer));
    });
  }

  /**
   * Updates the target body metadata with a new document definition.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata to update
   * @param definition The new document definition
   */
  static async updateTargetBodyMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    definition: DocumentDefinition,
  ) {
    metadata.targetBody = await DataMapperMetadataService.doCreateDocumentMetadata(
      api,
      metadataId,
      metadata,
      definition,
    );
    api.setMetadata(metadataId, metadata);
  }

  /**
   * Updates or adds a source parameter metadata with a new document definition.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata to update
   * @param name The parameter name
   * @param definition The new document definition
   */
  static async updateSourceParameterMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    name: string,
    definition: DocumentDefinition,
  ) {
    metadata.sourceParameters[name] = await DataMapperMetadataService.doCreateDocumentMetadata(
      api,
      metadataId,
      metadata,
      definition,
    );
    api.setMetadata(metadataId, metadata);
  }

  /**
   * Deletes a source parameter metadata.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata to update
   * @param name The parameter name to delete
   */
  static async deleteSourceParameterMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    name: string,
  ) {
    delete metadata.sourceParameters[name];
    api.setMetadata(metadataId, metadata);
  }

  /**
   * Renames a source parameter metadata.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata to update
   * @param oldName The current parameter name
   * @param newName The new parameter name
   */
  static async renameSourceParameterMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    oldName: string,
    newName: string,
  ) {
    // Remove old parameter and add with new name
    const { [oldName]: value, ...rest } = metadata.sourceParameters;
    metadata.sourceParameters = { ...rest, [newName]: value };
    delete metadata.sourceParameters[oldName];

    await api.setMetadata(metadataId, metadata);
  }

  /**
   * Updates the XSLT mapping file content.
   * @param api The metadata API
   * @param metadata The DataMapper metadata
   * @param xsltFile The new XSLT file content
   */
  static async updateMappingFile(api: IMetadataApi, metadata: IDataMapperMetadata, xsltFile: string) {
    await api.saveResourceContent(metadata.xsltPath, xsltFile);
  }

  /**
   * Prompts the user to select a document schema file.
   * @param api The metadata API
   * @param fileNamePattern The file name pattern to filter (e.g., "**\/*.xsd")
   * @returns Promise resolving to the selected file path(s) or undefined if cancelled
   */
  static async selectDocumentSchema(
    api: IMetadataApi,
    fileNamePattern: string,
  ): Promise<string[] | string | undefined> {
    return await api.askUserForFileSelection(fileNamePattern, undefined, {
      canPickMany: true,
      placeHolder: 'Choose schema file(s) to attach. You can upload more files later to resolve dependencies.',
      title: 'Attaching document schema file(s)',
    });
  }

  /**
   * Deletes DataMapper metadata.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   */
  static async deleteMetadata(api: IMetadataApi, metadataId: string) {
    await api.setMetadata(metadataId, undefined);
  }

  /**
   * Deletes the XSLT file associated with the metadata.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   */
  static async deleteXsltFile(api: IMetadataApi, metadataId: string) {
    const metadata = (await api.getMetadata(metadataId)) as IDataMapperMetadata;
    await api.deleteResource(metadata.xsltPath);
  }

  /**
   * Sets or updates a field type override for a document.
   * If an override with the same path already exists, it will be updated.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata to update
   * @param documentType The type of document (SOURCE_BODY, TARGET_BODY, or PARAM)
   * @param paramName The parameter name (required if documentType is PARAM)
   * @param fieldTypeOverride The field type override to set
   */
  static async setFieldTypeOverride(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    documentType: DocumentType,
    paramName: string | undefined,
    fieldTypeOverride: IFieldTypeOverride,
  ) {
    const docMetadata = this.getDocumentMetadata(metadata, documentType, paramName);
    if (!docMetadata) {
      return;
    }

    docMetadata.fieldTypeOverrides ??= [];

    const existingIndex = docMetadata.fieldTypeOverrides.findIndex(
      (override) => override.path === fieldTypeOverride.path,
    );

    if (existingIndex >= 0) {
      docMetadata.fieldTypeOverrides[existingIndex] = fieldTypeOverride;
    } else {
      docMetadata.fieldTypeOverrides.push(fieldTypeOverride);
    }

    await api.setMetadata(metadataId, metadata);
  }

  /**
   * Removes a field type override from a document by its path.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata to update
   * @param documentType The type of document (SOURCE_BODY, TARGET_BODY, or PARAM)
   * @param paramName The parameter name (required if documentType is PARAM)
   * @param path The XPath of the field type override to remove
   */
  static async removeFieldTypeOverride(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    documentType: DocumentType,
    paramName: string | undefined,
    path: string,
  ) {
    const docMetadata = this.getDocumentMetadata(metadata, documentType, paramName);
    if (!docMetadata?.fieldTypeOverrides) {
      return;
    }

    docMetadata.fieldTypeOverrides = docMetadata.fieldTypeOverrides.filter((override) => override.path !== path);

    await api.setMetadata(metadataId, metadata);
  }

  /**
   * Gets all field type overrides for a document.
   * @param metadata The DataMapper metadata
   * @param documentType The type of document (SOURCE_BODY, TARGET_BODY, or PARAM)
   * @param paramName The parameter name (required if documentType is PARAM)
   * @returns Array of field type overrides or empty array if none exist
   */
  static getFieldTypeOverrides(
    metadata: IDataMapperMetadata,
    documentType: DocumentType,
    paramName?: string,
  ): IFieldTypeOverride[] {
    const docMetadata = this.getDocumentMetadata(metadata, documentType, paramName);
    return docMetadata?.fieldTypeOverrides || [];
  }

  /**
   * Sets the choice selections for the specified document.
   * Replaces the entire choice selections array and persists the metadata.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata
   * @param documentType The document type (SOURCE_BODY, TARGET_BODY, or PARAM)
   * @param paramName The parameter name (required when documentType is PARAM)
   * @param selections The complete array of choice selections to set
   */
  static async setChoiceSelections(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    documentType: DocumentType,
    paramName: string | undefined,
    selections: IChoiceSelection[],
  ) {
    const docMetadata = this.getDocumentMetadata(metadata, documentType, paramName);
    if (!docMetadata) {
      return;
    }

    docMetadata.choiceSelections = selections;

    await api.setMetadata(metadataId, metadata);
  }

  /**
   * Gets the choice selections for the specified document.
   * @param metadata The DataMapper metadata
   * @param documentType The document type (SOURCE_BODY, TARGET_BODY, or PARAM)
   * @param paramName The parameter name (required when documentType is PARAM)
   * @returns The array of choice selections, or an empty array if none exist
   */
  static getChoiceSelections(
    metadata: IDataMapperMetadata,
    documentType: DocumentType,
    paramName?: string,
  ): IChoiceSelection[] {
    const docMetadata = this.getDocumentMetadata(metadata, documentType, paramName);
    return docMetadata?.choiceSelections || [];
  }

  /**
   * Sets the namespace map for the metadata.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata to update
   * @param namespaceMap The namespace map (prefix to URI mapping)
   */
  static async setNamespaceMap(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    namespaceMap: Record<string, string>,
  ) {
    metadata.namespaceMap = namespaceMap;
    await api.setMetadata(metadataId, metadata);
  }

  /**
   * Gets the namespace map from metadata.
   * @param metadata The DataMapper metadata
   * @returns The namespace map or empty object if none exists
   */
  static getNamespaceMap(metadata: IDataMapperMetadata): Record<string, string> {
    return metadata.namespaceMap || {};
  }

  private static getDocumentMetadata(
    metadata: IDataMapperMetadata,
    documentType: DocumentType,
    paramName?: string,
  ): IDocumentMetadata | undefined {
    switch (documentType) {
      case DocumentType.SOURCE_BODY:
        return metadata.sourceBody;
      case DocumentType.TARGET_BODY:
        return metadata.targetBody;
      case DocumentType.PARAM:
        return paramName ? metadata.sourceParameters[paramName] : undefined;
      default:
        return undefined;
    }
  }
}
