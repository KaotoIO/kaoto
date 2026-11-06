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
   * Persists a generated validation wrapper schema, and its aggregator schemas, next to the XSLT file.
   * Aggregators of a previous wrapper that are not needed anymore are removed.
   * @param api The metadata API
   * @param xsltPath The path of the XSLT file the wrapper belongs to
   * @param xsd The wrapper schema content
   * @param aggregators The aggregator schemas the wrapper imports, by path
   * @returns `undefined` when the wrapper was written; otherwise the reason it was not (a user file with a generated
   * name exists, or the write failed). The caller reports it.
   */
  static async saveValidationWrapper(
    api: IMetadataApi,
    xsltPath: string,
    xsd: string,
    aggregators: Record<string, string> = {},
  ): Promise<string | undefined> {
    try {
      const wrapperPath = XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath);
      // Never overwrite a user file that happens to have one of the generated names.
      for (const path of [wrapperPath, ...Object.keys(aggregators)]) {
        if (!(await DataMapperMetadataService.isUserFile(api, path))) continue;
        return `"${path}" is not a generated file and must not be overwritten`;
      }
      const previous = await DataMapperMetadataService.readGeneratedFile(api, wrapperPath);
      const previousAggregators = previous
        ? XmlSchemaWrapperGeneratorService.findAggregatorPaths(wrapperPath, previous)
        : [];
      for (const [path, content] of Object.entries(aggregators)) {
        await api.saveResourceContent(path, content);
      }
      await api.saveResourceContent(wrapperPath, xsd);
      for (const stale of previousAggregators.filter((path) => !(path in aggregators))) {
        await DataMapperMetadataService.deleteGeneratedFile(api, stale);
      }
      return undefined;
    } catch (error) {
      return String(error);
    }
  }

  /**
   * Copies the generated validation wrapper of an XSLT file, and its aggregator schemas, to a new XSLT file.
   * The wrapper references schemas through relative `schemaLocation`s. This stays valid for the copy
   * because every XSLT file lives in the same directory (file names can not contain a path separator).
   * @param api The metadata API
   * @param originalXsltPath The path of the original XSLT file
   * @param newXsltPath The path of the new XSLT file
   * @returns `renames`: the old to new path of every copied file (the wrapper and its aggregators). Empty when
   * nothing was copied. `failure` is only set when there was a wrapper that could not be copied (an aggregator is
   * missing, a target is a user file that must not be overwritten, or an I/O error); it is `undefined` when there
   * was nothing to copy (no wrapper, or the wrapper is a user file).
   */
  static async duplicateValidationWrapper(
    api: IMetadataApi,
    originalXsltPath: string,
    newXsltPath: string,
  ): Promise<{ renames: Record<string, string>; failure?: string }> {
    if (!originalXsltPath || !newXsltPath) return { renames: {} };
    try {
      const oldWrapper = XmlSchemaWrapperGeneratorService.getWrapperPath(originalXsltPath);
      const newWrapper = XmlSchemaWrapperGeneratorService.getWrapperPath(newXsltPath);
      const wrapperContent = await DataMapperMetadataService.readGeneratedFile(api, oldWrapper);
      if (wrapperContent === undefined) return { renames: {} };

      const renames: Record<string, string> = { [oldWrapper]: newWrapper };
      const contents: Record<string, string> = {
        [newWrapper]: XmlSchemaWrapperGeneratorService.retargetAggregators(wrapperContent, oldWrapper, newWrapper),
      };
      for (const oldAggregator of XmlSchemaWrapperGeneratorService.findAggregatorPaths(oldWrapper, wrapperContent)) {
        const aggregatorContent = await DataMapperMetadataService.readGeneratedFile(api, oldAggregator);
        // A wrapper without one of its aggregators can not be loaded, so it is not worth copying.
        if (aggregatorContent === undefined) {
          return { renames: {}, failure: `the aggregator schema "${oldAggregator}" does not exist` };
        }
        const newAggregator = XmlSchemaWrapperGeneratorService.retargetAggregatorPath(
          oldAggregator,
          oldWrapper,
          newWrapper,
        );
        renames[oldAggregator] = newAggregator;
        contents[newAggregator] = aggregatorContent;
      }

      for (const target of Object.keys(contents)) {
        if (await DataMapperMetadataService.isUserFile(api, target)) {
          return { renames: {}, failure: `"${target}" is not a generated file and must not be overwritten` };
        }
      }
      // The aggregators first, the wrapper last: the wrapper only exists when everything it needs exists.
      for (const [path, content] of Object.entries(contents).reverse()) {
        await api.saveResourceContent(path, content);
      }
      return { renames };
    } catch (error) {
      return { renames: {}, failure: String(error) };
    }
  }

  private static warnWrapperCopyFailure(originalXsltPath: string, failure: string | undefined): void {
    if (failure) {
      console.warn(`Could not copy the validation wrapper of "${originalXsltPath}": ${failure}`);
    }
  }

  /**
   * Deletes the generated validation wrapper of an XSLT file and its aggregator schemas. Best-effort: only files
   * carrying the Kaoto generated marker are deleted (a user file with the same name is left alone), errors are logged.
   * @param api The metadata API
   * @param xsltPath The path of the XSLT file the wrapper belongs to
   */
  static async deleteValidationWrapper(api: IMetadataApi, xsltPath: string): Promise<void> {
    if (!xsltPath) return;
    const wrapperPath = XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath);
    try {
      const content = await DataMapperMetadataService.readGeneratedFile(api, wrapperPath);
      if (content === undefined) return;
      for (const aggregator of XmlSchemaWrapperGeneratorService.findAggregatorPaths(wrapperPath, content)) {
        await DataMapperMetadataService.deleteGeneratedFile(api, aggregator);
      }
      await api.deleteResource(wrapperPath);
    } catch (error) {
      console.warn(`Could not delete the validation wrapper "${wrapperPath}": ${error}`);
    }
  }

  /**
   * Duplicates the files a DataMapper step owns: the XSLT file and the generated validation wrapper (if any).
   * The caller applies the returned paths to the step definition, see `DataMapperStepService`.
   * @param api The metadata API
   * @param originalMetadata The metadata containing the original XSLT path
   * @param newXsltPath The path for the duplicated XSLT file
   * @returns The old to new path of the XSLT file and of every wrapper file that was copied
   */
  static async duplicateMetadataFiles(
    api: IMetadataApi,
    originalMetadata: IDataMapperMetadata,
    newXsltPath: string,
  ): Promise<Record<string, string>> {
    await DataMapperMetadataService.duplicateXsltFile(api, originalMetadata, newXsltPath);
    return DataMapperMetadataService.withWrapperRenames(api, originalMetadata.xsltPath, newXsltPath);
  }

  /**
   * Copies the validation wrapper that belongs to `oldXsltPath` (if there is one), warns when that fails and
   * returns the old to new path map of the XSLT file and of every wrapper file that was copied.
   */
  private static async withWrapperRenames(
    api: IMetadataApi,
    oldXsltPath: string,
    newXsltPath: string,
  ): Promise<Record<string, string>> {
    const { renames, failure } = await DataMapperMetadataService.duplicateValidationWrapper(
      api,
      oldXsltPath,
      newXsltPath,
    );
    DataMapperMetadataService.warnWrapperCopyFailure(oldXsltPath, failure);
    return { [oldXsltPath]: newXsltPath, ...renames };
  }

  /**
   * Renames the XSLT file of a DataMapper step together with the files it owns: the metadata points to the new
   * XSLT file, and the generated validation wrapper moves along. The old files are NOT deleted here: the caller first
   * applies the returned paths to the step definition, see `DataMapperStepService.applyResourceRenamesToNode`, and
   * then deletes them with {@link deleteRenamedFiles}. A failing model update therefore never leaves the route
   * pointing to a deleted file.
   *
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param newXsltPath The new XSLT file path
   * @returns The old to new path of every file that was moved; `undefined` when there was nothing to rename (no
   * metadata, the path did not change, the XSLT file does not exist or is unreadable)
   */
  static async renameXsltFile(
    api: IMetadataApi,
    metadataId: string,
    newXsltPath: string,
  ): Promise<Record<string, string> | undefined> {
    const metadata = await api.getMetadata<IDataMapperMetadata>(metadataId);
    const oldXsltPath = metadata?.xsltPath;
    if (!metadata || !oldXsltPath || oldXsltPath === newXsltPath) return undefined;
    if (!(await api.isResourceExist(oldXsltPath))) return undefined;

    const content = await api.getResourceContent(oldXsltPath);
    if (content === undefined) return undefined;

    await api.saveResourceContent(newXsltPath, content);
    await DataMapperMetadataService.updateXsltPath(api, metadataId, metadata, newXsltPath);
    return DataMapperMetadataService.withWrapperRenames(api, oldXsltPath, newXsltPath);
  }

  /**
   * Deletes the files that were moved by {@link renameXsltFile}, once the step definition points to the new ones.
   * The old XSLT file is always deleted. The old wrapper and its aggregators (the `.xsd` keys of `renames`, i.e. the
   * ones that were copied) are deleted only when Kaoto generated them.
   * @param api The metadata API
   * @param renames The old to new path map returned by {@link renameXsltFile}
   */
  static async deleteRenamedFiles(api: IMetadataApi, renames: Record<string, string>): Promise<void> {
    for (const oldPath of Object.keys(renames)) {
      if (oldPath.endsWith('.xsd')) {
        await DataMapperMetadataService.deleteGeneratedFile(api, oldPath);
      } else {
        await api.deleteResource(oldPath);
      }
    }
  }

  /**
   * Reads a file only when it exists and Kaoto generated it.
   * @returns The content, `undefined` for a missing file or a user file
   */
  private static async readGeneratedFile(api: IMetadataApi, path: string): Promise<string | undefined> {
    if (!(await api.isResourceExist(path))) return undefined;
    const content = await api.getResourceContent(path);
    return content && XmlSchemaWrapperGeneratorService.isGeneratedWrapper(content) ? content : undefined;
  }

  /** @returns true when a file exists at the path and Kaoto did not generate it */
  private static async isUserFile(api: IMetadataApi, path: string): Promise<boolean> {
    if (!(await api.isResourceExist(path))) return false;
    const content = await api.getResourceContent(path);
    return !!content && !XmlSchemaWrapperGeneratorService.isGeneratedWrapper(content);
  }

  private static async deleteGeneratedFile(api: IMetadataApi, path: string): Promise<void> {
    if ((await DataMapperMetadataService.readGeneratedFile(api, path)) !== undefined) {
      await api.deleteResource(path);
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
