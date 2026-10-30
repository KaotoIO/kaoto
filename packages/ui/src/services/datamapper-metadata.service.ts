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
import { XmlSchemaWrapperGeneratorService } from './document/xml-schema/xml-schema-wrapper-generator.service';
import { EMPTY_XSL } from './mapping/mapping-serializer.service';

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
      ).then((definition) => (answer.sourceBody = definition));
      const targetBodyPromise = DataMapperMetadataService.doLoadDocument(
        api,
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        metadata.targetBody,
      ).then((definition) => (answer.targetBody = definition));
      const paramPromises = Object.entries(metadata.sourceParameters).reduce(
        (acc, [key, meta]) => {
          acc[key] = DataMapperMetadataService.doLoadDocument(api, DocumentType.PARAM, key, meta).then(
            (definition) => (answer.sourceParameters[key] = definition),
          );
          return acc;
        },
        {} as Record<string, Promise<DocumentDefinition>>,
      );
      void Promise.allSettled([sourceBodyPromise, targetBodyPromise, ...Object.values(paramPromises)]).then(() => {
        resolve(answer);
      });
    });
  }

  private static doLoadDocument(
    api: IMetadataApi,
    documentType: DocumentType,
    name: string,
    documentMetadata: IDocumentMetadata,
  ): Promise<DocumentDefinition> {
    return new Promise((resolve) => {
      const definitionType = documentMetadata.type ? documentMetadata.type : DocumentDefinitionType.Primitive;
      const filePaths = documentMetadata.filePath ?? [];
      const fileReadingPromises = filePaths.map((path) =>
        api.getResourceContent(path).catch((error) => {
          console.log(`Could not read a file "${path}": ${error}`);
          return undefined;
        }),
      );
      void Promise.all(fileReadingPromises).then((contents) => {
        // Built after all reads settled, in `filePath` order, so the key order of `definitionFiles`
        // does not depend on which read completed first.
        const definitionFiles: Record<string, string> = {};
        filePaths.forEach((path, i) => {
          if (contents[i]) definitionFiles[path] = contents[i];
        });
        const answer = new DocumentDefinition(
          documentType,
          definitionType,
          name,
          definitionFiles,
          documentMetadata.rootElementChoice,
          documentMetadata.fieldTypeOverrides,
          documentMetadata.choiceSelections,
          documentMetadata.fieldSubstitutions,
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
   * Updates the XSLT path in the metadata.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata
   * @param newXsltPath The new XSLT file path
   */
  static async updateXsltPath(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    newXsltPath: string,
  ): Promise<void> {
    const updatedMetadata = { ...metadata, xsltPath: newXsltPath };
    await api.setMetadata(metadataId, updatedMetadata);
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
    metadata.sourceBody = await DataMapperMetadataService.doCreateDocumentMetadata(api, definition);
    await api.setMetadata(metadataId, metadata);
  }

  private static async doCreateDocumentMetadata(
    api: IMetadataApi,
    definition: DocumentDefinition,
  ): Promise<IDocumentMetadata> {
    const filePaths = definition.definitionFiles ? Object.keys(definition.definitionFiles) : [];
    const answer: IDocumentMetadata = {
      type: definition.definitionType,
      filePath: filePaths,
      rootElementChoice: definition.rootElementChoice,
      fieldTypeOverrides: definition.fieldTypeOverrides,
      choiceSelections: definition.choiceSelections,
      fieldSubstitutions: definition.fieldSubstitutions,
    };
    const filePromises =
      api.shouldSaveSchema && definition.definitionFiles
        ? Object.entries(definition.definitionFiles).map(([path, content]) => {
            return api.saveResourceContent(path, content).catch((error) => {
              console.log(`Could not save a file "${path}": ${error}`);
            });
          })
        : [];

    await Promise.allSettled(filePromises);

    return answer;
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
    metadata.targetBody = await DataMapperMetadataService.doCreateDocumentMetadata(api, definition);
    await api.setMetadata(metadataId, metadata);
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
    metadata.sourceParameters[name] = await DataMapperMetadataService.doCreateDocumentMetadata(api, definition);
    await api.setMetadata(metadataId, metadata);
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
    await api.setMetadata(metadataId, metadata);
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
   * Deletes DataMapper metadata. The generated validation wrapper schema is a DataMapper-managed
   * file that belongs to the step, so it is removed here as well, regardless of whether the user
   * keeps the XSLT file. Wrapper removal is best-effort and never blocks the metadata removal.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   */
  static async deleteMetadata(api: IMetadataApi, metadataId: string) {
    try {
      const metadata = await api.getMetadata<IDataMapperMetadata>(metadataId);
      if (metadata?.xsltPath) {
        await DataMapperMetadataService.deleteValidationWrapper(api, metadata.xsltPath);
      }
    } catch (error) {
      console.warn(`Could not clean up the validation wrapper for "${metadataId}": ${error}`);
    }
    await api.setMetadata(metadataId, undefined);
  }

  /**
   * Checks whether the target body of a DataMapper step is a Primitive (no schema attached).
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @returns true when there is no metadata, no target body or the target body is a Primitive
   */
  static async isTargetBodyPrimitive(api: IMetadataApi, metadataId: string): Promise<boolean> {
    const metadata = await api.getMetadata<IDataMapperMetadata>(metadataId);
    return !metadata?.targetBody || metadata.targetBody.type === DocumentDefinitionType.Primitive;
  }

  /**
   * Loads the target body document definition (including the content of its schema files).
   * @param api The metadata API
   * @param metadata The DataMapper metadata
   * @returns The target body definition; unreadable or empty schema files are not part of it
   */
  static loadTargetBodyDefinition(api: IMetadataApi, metadata: IDataMapperMetadata): Promise<DocumentDefinition> {
    return DataMapperMetadataService.doLoadDocument(
      api,
      DocumentType.TARGET_BODY,
      BODY_DOCUMENT_ID,
      metadata.targetBody,
    );
  }

  /**
   * Persists a generated validation wrapper schema next to the XSLT file.
   * @param api The metadata API
   * @param xsltPath The path of the XSLT file the wrapper belongs to
   * @param xsd The wrapper schema content
   * @returns true when the wrapper was written
   */
  static async saveValidationWrapper(api: IMetadataApi, xsltPath: string, xsd: string): Promise<boolean> {
    try {
      await api.saveResourceContent(XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath), xsd);
      return true;
    } catch (error) {
      console.warn(`Could not save the validation wrapper for "${xsltPath}": ${error}`);
      return false;
    }
  }

  /**
   * Copies the generated validation wrapper of an XSLT file to a new XSLT file.
   * The wrapper references schemas through relative `schemaLocation`s. This stays valid for the copy
   * because every XSLT file lives in the same directory (file names can not contain a path separator).
   * @param api The metadata API
   * @param originalXsltPath The path of the original XSLT file
   * @param newXsltPath The path of the new XSLT file
   * @returns true only when a wrapper file was written; false when there was nothing to copy
   * (no wrapper, a user file with the same name as the original wrapper), the target is a user file
   * that must not be overwritten, or the copy failed
   */
  static async duplicateValidationWrapper(
    api: IMetadataApi,
    originalXsltPath: string,
    newXsltPath: string,
  ): Promise<boolean> {
    if (!originalXsltPath || !newXsltPath) return false;
    try {
      const content = await api.getResourceContent(XmlSchemaWrapperGeneratorService.getWrapperPath(originalXsltPath));
      if (!content || !XmlSchemaWrapperGeneratorService.isGeneratedWrapper(content)) return false;
      const newWrapperPath = XmlSchemaWrapperGeneratorService.getWrapperPath(newXsltPath);
      // Never overwrite a user file that happens to have the wrapper name.
      const existing = await api.getResourceContent(newWrapperPath);
      if (existing && !XmlSchemaWrapperGeneratorService.isGeneratedWrapper(existing)) return false;
      await api.saveResourceContent(newWrapperPath, content);
      return true;
    } catch (error) {
      console.warn(`Could not copy the validation wrapper of "${originalXsltPath}": ${error}`);
      return false;
    }
  }

  /**
   * Deletes the generated validation wrapper of an XSLT file. Best-effort: only a file carrying the
   * Kaoto generated marker is deleted (a user file with the same name is left alone), errors are logged.
   * @param api The metadata API
   * @param xsltPath The path of the XSLT file the wrapper belongs to
   */
  static async deleteValidationWrapper(api: IMetadataApi, xsltPath: string): Promise<void> {
    if (!xsltPath) return;
    const wrapperPath = XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath);
    try {
      const content = await api.getResourceContent(wrapperPath);
      if (content && XmlSchemaWrapperGeneratorService.isGeneratedWrapper(content)) {
        await api.deleteResource(wrapperPath);
      }
    } catch (error) {
      console.warn(`Could not delete the validation wrapper "${wrapperPath}": ${error}`);
    }
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
   * Sets the field type overrides for the specified document.
   * Replaces the entire field type overrides array and persists the metadata.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param metadata The DataMapper metadata
   * @param documentType The document type (SOURCE_BODY, TARGET_BODY, or PARAM)
   * @param paramName The parameter name (required when documentType is PARAM)
   * @param fieldTypeOverrides The complete array of field type overrides to set
   */
  static async setFieldTypeOverrides(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    documentType: DocumentType,
    paramName: string | undefined,
    fieldTypeOverrides: IFieldTypeOverride[],
  ) {
    const docMetadata = this.getDocumentMetadata(metadata, documentType, paramName);
    if (!docMetadata) {
      return;
    }

    docMetadata.fieldTypeOverrides = fieldTypeOverrides;

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
