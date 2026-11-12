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
   * Deletes DataMapper metadata. The generated files the step owns (today the validation wrapper schema) are
   * DataMapper-managed, so they are removed here as well, regardless of whether the user keeps the XSLT file.
   * Their removal is best-effort and never blocks the metadata removal.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   */
  static async deleteMetadata(api: IMetadataApi, metadataId: string) {
    try {
      const metadata = await api.getMetadata<IDataMapperMetadata>(metadataId);
      if (metadata?.xsltPath) {
        await DataMapperMetadataService.deleteManagedFiles(api, metadata.xsltPath);
      }
    } catch (error) {
      console.warn(`Could not clean up the validation wrapper for "${metadataId}": ${error}`);
    }
    await api.setMetadata(metadataId, undefined);
  }

  /**
   * The type of the target body of a DataMapper step, so a caller (e.g. to decide what it supports) does not need
   * to special-case the metadata or the target body not existing yet.
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @returns `Primitive` when there is no metadata or no target body (nothing attached yet)
   */
  static async getTargetBodyType(api: IMetadataApi, metadataId: string): Promise<DocumentDefinitionType> {
    const metadata = await api.getMetadata<IDataMapperMetadata>(metadataId);
    return metadata?.targetBody?.type ?? DocumentDefinitionType.Primitive;
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
   * A file whose current generated content already equals the new one is not written again, so repeating this with
   * the same schema files leaves the files (and the file watchers) alone.
   * Aggregators of a previous wrapper that are not needed anymore are removed.
   * @param api The metadata API
   * @param xsltPath The path of the XSLT file the wrapper belongs to
   * @param xsd The wrapper schema content
   * @param aggregators The aggregator schemas the wrapper imports, by path
   * @returns `undefined` when the wrapper is in place; otherwise the reason it is not (a user file with a generated
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
      // Never overwrite a user file that happens to have one of the generated names. The wrapper is classified
      // once: that same read also tells which aggregators the previous wrapper used.
      const existing = await DataMapperMetadataService.classifyFile(api, wrapperPath);
      if (existing.kind === 'user') {
        return `"${wrapperPath}" is not a generated file and must not be overwritten`;
      }
      const aggregatorEntries = Object.entries(aggregators);
      const aggregatorClassifications = await Promise.all(
        aggregatorEntries.map(([path]) => DataMapperMetadataService.classifyFile(api, path)),
      );
      const userAggregatorIndex = aggregatorClassifications.findIndex((c) => c.kind === 'user');
      if (userAggregatorIndex >= 0) {
        return `"${aggregatorEntries[userAggregatorIndex][0]}" is not a generated file and must not be overwritten`;
      }
      const changedAggregators = aggregatorEntries.filter(([, content], index) => {
        const current = aggregatorClassifications[index];
        return current.kind !== 'generated' || current.content !== content;
      });
      const previousAggregators =
        existing.kind === 'generated'
          ? XmlSchemaWrapperGeneratorService.findAggregatorPaths(wrapperPath, existing.content)
          : [];
      await Promise.all(changedAggregators.map(([path, content]) => api.saveResourceContent(path, content)));
      if (existing.kind !== 'generated' || existing.content !== xsd) {
        await api.saveResourceContent(wrapperPath, xsd);
      }
      await Promise.all(
        previousAggregators
          .filter((path) => !(path in aggregators))
          .map((stale) => DataMapperMetadataService.deleteGeneratedFile(api, stale)),
      );
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
      const oldAggregators = XmlSchemaWrapperGeneratorService.findAggregatorPaths(oldWrapper, wrapperContent);
      const aggregatorContents = await Promise.all(
        oldAggregators.map((path) => DataMapperMetadataService.readGeneratedFile(api, path)),
      );
      // A wrapper without one of its aggregators can not be loaded, so it is not worth copying.
      const missingAggregatorIndex = aggregatorContents.indexOf(undefined);
      if (missingAggregatorIndex >= 0) {
        return {
          renames: {},
          failure: `the aggregator schema "${oldAggregators[missingAggregatorIndex]}" does not exist`,
        };
      }
      oldAggregators.forEach((oldAggregator, index) => {
        const newAggregator = XmlSchemaWrapperGeneratorService.retargetAggregatorPath(
          oldAggregator,
          oldWrapper,
          newWrapper,
        );
        renames[oldAggregator] = newAggregator;
        contents[newAggregator] = aggregatorContents[index]!;
      });

      const targets = Object.keys(contents);
      const targetClassifications = await Promise.all(
        targets.map((target) => DataMapperMetadataService.classifyFile(api, target)),
      );
      const userTargetIndex = targetClassifications.findIndex((c) => c.kind === 'user');
      if (userTargetIndex >= 0) {
        const target = targets[userTargetIndex];
        return { renames: {}, failure: `"${target}" is not a generated file and must not be overwritten` };
      }
      // The aggregators first, the wrapper last: the wrapper only exists when everything it needs exists.
      const aggregatorWrites = Object.entries(contents).filter(([path]) => path !== newWrapper);
      const results = await Promise.allSettled(
        aggregatorWrites.map(([path, content]) => api.saveResourceContent(path, content)),
      );
      const written = aggregatorWrites
        .filter((_, index) => results[index].status === 'fulfilled')
        .map(([path]) => path);
      const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (rejected) {
        await DataMapperMetadataService.removeCopies(api, written);
        return { renames: {}, failure: String(rejected.reason) };
      }
      try {
        await api.saveResourceContent(newWrapper, contents[newWrapper]);
      } catch (error) {
        await DataMapperMetadataService.removeCopies(api, written);
        return { renames: {}, failure: String(error) };
      }
      return { renames };
    } catch (error) {
      return { renames: {}, failure: String(error) };
    }
  }

  /**
   * Removes files this service wrote a moment ago and that nothing references yet. Best-effort per file: a failing
   * removal never replaces the reason the caller is about to report.
   */
  private static async removeCopies(api: IMetadataApi, paths: string[]): Promise<void> {
    const results = await Promise.allSettled(paths.map((path) => api.deleteResource(path)));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`Could not remove "${paths[index]}" after the failed copy: ${result.reason}`);
      }
    });
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
      await Promise.all(
        XmlSchemaWrapperGeneratorService.findAggregatorPaths(wrapperPath, content).map((aggregator) =>
          DataMapperMetadataService.deleteGeneratedFile(api, aggregator),
        ),
      );
      await api.deleteResource(wrapperPath);
    } catch (error) {
      console.warn(`Could not delete the validation wrapper "${wrapperPath}": ${error}`);
    }
  }

  /**
   * Copies every generated file the step owns to the files of a new XSLT file (today: the validation wrapper and
   * its aggregators). A new managed file type is added here and in {@link deleteManagedFiles}; it must carry the
   * Kaoto generated marker, because overwrites and deletes only touch marked files.
   * @returns `renames`: the old to new path of every file that was really copied, without the XSLT file itself.
   * `failure` is set when a managed file could not be copied.
   */
  private static copyManagedFiles(
    api: IMetadataApi,
    oldXsltPath: string,
    newXsltPath: string,
  ): Promise<{ renames: Record<string, string>; failure?: string }> {
    return DataMapperMetadataService.duplicateValidationWrapper(api, oldXsltPath, newXsltPath);
  }

  /**
   * Deletes every generated file the step owns (today: the validation wrapper and its aggregators). Best-effort.
   */
  private static deleteManagedFiles(api: IMetadataApi, xsltPath: string): Promise<void> {
    return DataMapperMetadataService.deleteValidationWrapper(api, xsltPath);
  }

  /**
   * Duplicates the files a DataMapper step owns: the XSLT file and the generated files it owns (if any).
   * A managed file that could not be copied is only a `console.warn`: the duplicate/paste addons run outside React
   * and have no way to show it.
   * The caller applies the returned paths to the step definition, see `DataMapperStepService`.
   * @param api The metadata API
   * @param originalMetadata The metadata containing the original XSLT path
   * @param newXsltPath The path for the duplicated XSLT file
   * @returns The old to new path of the XSLT file and of every managed file that was copied
   */
  static async duplicateMetadataFiles(
    api: IMetadataApi,
    originalMetadata: IDataMapperMetadata,
    newXsltPath: string,
  ): Promise<Record<string, string>> {
    const oldXsltPath = originalMetadata.xsltPath;
    await DataMapperMetadataService.duplicateXsltFile(api, originalMetadata, newXsltPath);
    const { renames, failure } = await DataMapperMetadataService.copyManagedFiles(api, oldXsltPath, newXsltPath);
    DataMapperMetadataService.warnWrapperCopyFailure(oldXsltPath, failure);
    return { [oldXsltPath]: newXsltPath, ...renames };
  }

  /**
   * Renames the XSLT file of a DataMapper step together with the files it owns. The metadata points to the new XSLT
   * file, `applyRenames` lets the caller apply the old to new path map to the step definition, and then the old
   * files are deleted. A failing model update therefore never leaves the route pointing to a deleted file.
   *
   * The new files are written first. When that fails (the new XSLT, a managed file, or the metadata update) nothing
   * references them, so they are removed again and the error is thrown; the route and the metadata are unchanged.
   * When `applyRenames` throws, the metadata is pointed back, nothing is deleted and the copies stay (the model may
   * or may not have been changed, and deleting them could leave the route on missing files).
   *
   * @param api The metadata API
   * @param metadataId The metadata identifier
   * @param newXsltPath The new XSLT file path
   * @param applyRenames Applies the old to new path map to the step definition and persists it
   * @returns The old to new path of every file that was moved; `undefined` when there was nothing to rename (no
   * metadata, the path did not change, the XSLT file does not exist or is unreadable)
   * @throws An `Error` with a sentence for the user when the rename was aborted
   */
  static async renameXsltFile(
    api: IMetadataApi,
    metadataId: string,
    newXsltPath: string,
    applyRenames: (renames: Record<string, string>) => void | Promise<void>,
  ): Promise<Record<string, string> | undefined> {
    const metadata = await api.getMetadata<IDataMapperMetadata>(metadataId);
    const oldXsltPath = metadata?.xsltPath;
    if (!metadata || !oldXsltPath || oldXsltPath === newXsltPath) return undefined;
    if (!(await api.isResourceExist(oldXsltPath))) return undefined;

    const content = await api.getResourceContent(oldXsltPath);
    if (content === undefined) return undefined;

    // The service must not overwrite a file, and the cleanup below must not delete a file it did not create.
    if (await api.isResourceExist(newXsltPath)) {
      throw DataMapperMetadataService.renameError(newXsltPath, 'the file already exists');
    }

    try {
      await api.saveResourceContent(newXsltPath, content);
    } catch (error) {
      throw DataMapperMetadataService.renameError(newXsltPath, error);
    }

    const { renames: copied, failure } = await DataMapperMetadataService.copyManagedFiles(
      api,
      oldXsltPath,
      newXsltPath,
    );
    const renames = { [oldXsltPath]: newXsltPath, ...copied };
    if (failure) {
      await DataMapperMetadataService.removeCopies(api, Object.values(renames));
      throw new Error(
        `Could not copy the validation wrapper of "${oldXsltPath}", the document was not renamed: ${failure}. ` +
          'To rename anyway, turn off Validate output, rename, and turn it on again.',
      );
    }

    try {
      await DataMapperMetadataService.updateXsltPath(api, metadataId, metadata, newXsltPath);
    } catch (error) {
      await DataMapperMetadataService.removeCopies(api, Object.values(renames));
      throw DataMapperMetadataService.renameError(newXsltPath, error);
    }

    try {
      await applyRenames(renames);
    } catch (error) {
      try {
        await DataMapperMetadataService.updateXsltPath(api, metadataId, metadata, oldXsltPath);
      } catch (restoreError) {
        console.warn(`Could not point the metadata back to "${oldXsltPath}": ${restoreError}`);
      }
      throw DataMapperMetadataService.renameError(newXsltPath, error);
    }

    await DataMapperMetadataService.deleteOldFiles(api, oldXsltPath, renames);
    return renames;
  }

  private static renameError(newXsltPath: string, reason: unknown): Error {
    const message = reason instanceof Error ? reason.message : String(reason);
    return new Error(`Could not rename the document to "${newXsltPath}": ${message}`);
  }

  /**
   * Deletes the files that were moved, once the step definition points to the new ones. Best-effort per file: a
   * failure is logged and never fails the rename. The old XSLT file is always deleted; every other old file only
   * when it carries the Kaoto generated marker (a user file with a generated name is left alone).
   */
  private static async deleteOldFiles(
    api: IMetadataApi,
    oldXsltPath: string,
    renames: Record<string, string>,
  ): Promise<void> {
    await Promise.all(
      Object.keys(renames).map(async (oldPath) => {
        try {
          if (oldPath === oldXsltPath) {
            await api.deleteResource(oldPath);
          } else {
            await DataMapperMetadataService.deleteGeneratedFile(api, oldPath);
          }
        } catch (error) {
          console.warn(`Could not delete "${oldPath}" after the rename: ${error}`);
        }
      }),
    );
  }

  /**
   * Classifies a path in one pass, so callers do not probe the same file twice.
   *
   * `missing` covers a path with no file and a file that is empty or unreadable; `generated` is a file carrying the
   * Kaoto generated marker, which the DataMapper owns and may overwrite or delete; `user` is anything else and must
   * be left alone.
   *
   * @param api The metadata API
   * @param path The path to classify
   * @returns The kind of file, with its content when it is a generated one
   */
  private static async classifyFile(
    api: IMetadataApi,
    path: string,
  ): Promise<{ kind: 'missing' | 'user' } | { kind: 'generated'; content: string }> {
    if (!(await api.isResourceExist(path))) return { kind: 'missing' };
    const content = await api.getResourceContent(path);
    if (!content) return { kind: 'missing' };
    return XmlSchemaWrapperGeneratorService.isGeneratedWrapper(content)
      ? { kind: 'generated', content }
      : { kind: 'user' };
  }

  /**
   * Reads a file only when it exists and Kaoto generated it.
   * @returns The content, `undefined` for a missing file or a user file
   */
  private static async readGeneratedFile(api: IMetadataApi, path: string): Promise<string | undefined> {
    const file = await DataMapperMetadataService.classifyFile(api, path);
    return file.kind === 'generated' ? file.content : undefined;
  }

  private static async deleteGeneratedFile(api: IMetadataApi, path: string): Promise<void> {
    if ((await DataMapperMetadataService.classifyFile(api, path)).kind === 'generated') {
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
