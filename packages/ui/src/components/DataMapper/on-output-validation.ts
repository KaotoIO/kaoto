import { IVisualizationNode } from '../../models';
import { DocumentDefinition, DocumentDefinitionType } from '../../models/datamapper/document';
import { IDataMapperMetadata, IDocumentMetadata } from '../../models/datamapper/metadata';
import { EntitiesContextResult, IMetadataApi } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { DataMapperValidationStepService } from '../../services/datamapper-validation-step.service';
import { XmlSchemaWrapperGeneratorService } from '../../services/document/xml-schema/xml-schema-wrapper-generator.service';

/*
 * Output validation handlers. This is the only place that wires together
 *  - XmlSchemaWrapperGeneratorService (pure: decides which resource to validate against),
 *  - DataMapperMetadataService (resource I/O: loads schemas, persists, copies and deletes the wrapper file),
 *  - DataMapperValidationStepService (pure: mutates the Camel model).
 *
 * Concurrency (R3): all I/O is awaited first and the Camel model is mutated synchronously last.
 * `addValidationStep` re-checks for an existing validator after the awaits, so a concurrent toggle can not add
 * a second validator step. A vizNode edited by someone else in between is not detected.
 *
 * Orphan wrapper: the wrapper file is written before the model is mutated, and `addValidationStep` may still bail
 * out afterwards (e.g. the step has no XSLT step to insert the validator after). The wrapper is then left without a
 * validator referencing it. This is self-healing: the next disable, delete of the step, or change to a single schema
 * file removes it (`deleteValidationWrapper` / `deleteMetadata`), and the next enable overwrites it.
 */

/**
 * Resolves the resource the validator step has to point to for the given target body.
 * With several unconnected XML schema files a wrapper schema is generated and persisted next to the XSLT file.
 * In every other case the first schema file is used and a stale wrapper (e.g. left after going from several
 * schema files to one) is removed.
 *
 * Problems (missing files, analysis errors, fallbacks) are reported with `console.warn` only; the caller still gets
 * a usable URI.
 *
 * @param api The metadata API
 * @param targetMetadata The target body metadata
 * @param xsltPath The path of the XSLT file the wrapper belongs to
 * @param definitionFiles The loaded content of the target schema files. Unreadable or empty files are missing.
 * @returns The resource URI for the validator, empty when there is nothing to validate against
 */
export const resolveValidationResource = async (
  api: IMetadataApi,
  targetMetadata: IDocumentMetadata,
  xsltPath: string,
  definitionFiles: Record<string, string>,
): Promise<string> => {
  const defaultUri = targetMetadata.filePath?.[0] ?? '';
  const filePaths = targetMetadata.filePath ?? [];

  if (targetMetadata.type !== DocumentDefinitionType.XML_SCHEMA || !xsltPath || filePaths.length <= 1) {
    await DataMapperMetadataService.deleteValidationWrapper(api, xsltPath);
    return defaultUri;
  }

  const warnings: string[] = [];
  const missing = filePaths.filter((path) => !(path in definitionFiles));
  if (missing.length > 0) {
    warnings.push(`Schema file(s) missing or empty, not included in validation: ${missing.join(', ')}`);
  }

  const wrapperPath = XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath);
  const result = XmlSchemaWrapperGeneratorService.computeValidationUri(
    { definitionFiles, rootElement: targetMetadata.rootElementChoice },
    wrapperPath,
  );
  warnings.push(...result.warnings);
  if (warnings.length > 0) {
    console.warn(`[Output validation] ${warnings.join(' | ')}`);
  }

  if (result.kind === 'wrapper') {
    if (await DataMapperMetadataService.saveValidationWrapper(api, xsltPath, result.xsd)) {
      return result.uri;
    }
    return defaultUri;
  }

  await DataMapperMetadataService.deleteValidationWrapper(api, xsltPath);
  return result.uri || defaultUri;
};

/**
 * Enables or disables output validation for a DataMapper step. Resolves the metadata and the schema files itself,
 * so callers only pass the step.
 * @param api The metadata API
 * @param vizNode The DataMapper step
 * @param enabled Whether the validator step should exist afterwards
 * @param entitiesContext The entities context
 */
export const setOutputValidation = async (
  api: IMetadataApi,
  vizNode: IVisualizationNode,
  enabled: boolean,
  entitiesContext: EntitiesContextResult,
): Promise<void> => {
  const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);
  const metadata = await api.getMetadata<IDataMapperMetadata>(metadataId);

  if (!enabled) {
    DataMapperValidationStepService.removeValidationStep(vizNode, entitiesContext);
    if (metadata?.xsltPath) {
      await DataMapperMetadataService.deleteValidationWrapper(api, metadata.xsltPath);
    }
    return;
  }

  if (!metadata) return;

  const { targetBody, xsltPath } = metadata;
  const needsFiles = targetBody.type === DocumentDefinitionType.XML_SCHEMA && (targetBody.filePath?.length ?? 0) > 1;
  const definitionFiles = needsFiles
    ? ((await DataMapperMetadataService.loadTargetBodyDefinition(api, metadata)).definitionFiles ?? {})
    : {};
  const resourceUri = await resolveValidationResource(api, targetBody, xsltPath, definitionFiles);

  DataMapperValidationStepService.addValidationStep(vizNode, targetBody, entitiesContext, resourceUri);
};

/**
 * Keeps the validator step in step with the target body after the user changed the target schema.
 * - validation enabled: points the validator to the new schema (or wrapper), removes it for a Primitive target;
 * - validation disabled: adds the validator when the target changes from none/Primitive to a schema (enabled by
 *   default). A user who disabled validation on a schema target keeps it disabled.
 *
 * Call this after the target body metadata has been updated.
 *
 * @param api The metadata API
 * @param vizNode The DataMapper step
 * @param entitiesContext The entities context
 * @param metadata The DataMapper metadata, already updated with the new target body
 * @param definition The new target body definition (the source of the schema file content)
 * @param previousType The target body type before the change
 * @returns Whether validation is enabled afterwards
 */
export const syncOutputValidationOnTargetChange = async (
  api: IMetadataApi,
  vizNode: IVisualizationNode,
  entitiesContext: EntitiesContextResult,
  metadata: IDataMapperMetadata,
  definition: DocumentDefinition,
  previousType: DocumentDefinitionType | undefined,
): Promise<boolean> => {
  const isEnabled = DataMapperValidationStepService.isValidationEnabled(vizNode);
  const { targetBody, xsltPath } = metadata;

  if (isEnabled && targetBody.type === DocumentDefinitionType.Primitive) {
    // `updateValidationStep` removes the validator for a Primitive target.
    DataMapperValidationStepService.updateValidationStep(vizNode, targetBody, entitiesContext);
    await DataMapperMetadataService.deleteValidationWrapper(api, xsltPath);
  } else if (isEnabled) {
    const resourceUri = await resolveValidationResource(api, targetBody, xsltPath, definition.definitionFiles ?? {});
    DataMapperValidationStepService.updateValidationStep(vizNode, targetBody, entitiesContext, resourceUri);
  } else if (
    (previousType === undefined || previousType === DocumentDefinitionType.Primitive) &&
    definition.definitionType !== DocumentDefinitionType.Primitive
  ) {
    const resourceUri = await resolveValidationResource(api, targetBody, xsltPath, definition.definitionFiles ?? {});
    DataMapperValidationStepService.addValidationStep(vizNode, targetBody, entitiesContext, resourceUri);
  }

  return DataMapperValidationStepService.isValidationEnabled(vizNode);
};

/**
 * Copies the generated validation wrapper of an XSLT file next to a new XSLT file (duplicate, paste, rename) and
 * points the validator of the given step definition to the copy. The definition is only changed after the copy
 * succeeded; the caller persists it.
 *
 * @param api The metadata API
 * @param stepDefinition The step group definition that gets the new XSLT file
 * @param oldXsltPath The original XSLT path
 * @param newXsltPath The new XSLT path
 * @returns true when a wrapper was copied
 */
export const copyValidationWrapper = async (
  api: IMetadataApi,
  stepDefinition: unknown,
  oldXsltPath: string,
  newXsltPath: string,
): Promise<boolean> => {
  const copied = await DataMapperMetadataService.duplicateValidationWrapper(api, oldXsltPath, newXsltPath);
  if (copied) {
    DataMapperValidationStepService.retargetValidationResource(
      stepDefinition,
      XmlSchemaWrapperGeneratorService.getWrapperPath(oldXsltPath),
      XmlSchemaWrapperGeneratorService.getWrapperPath(newXsltPath),
    );
  }
  return copied;
};
