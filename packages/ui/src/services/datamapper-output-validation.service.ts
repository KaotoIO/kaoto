import { IVisualizationNode } from '../models';
import { DocumentDefinition, DocumentDefinitionType } from '../models/datamapper/document';
import { IDataMapperMetadata, IDocumentMetadata } from '../models/datamapper/metadata';
import { EntitiesContextResult, IMetadataApi } from '../providers';
import { DataMapperMetadataService } from './datamapper-metadata.service';
import { DataMapperStepService } from './datamapper-step.service';
import { DataMapperValidationStepService } from './datamapper-validation-step.service';
import { XmlSchemaWrapperGeneratorService } from './document/xml-schema/xml-schema-wrapper-generator.service';

/**
 * Owns turning the output validation of a DataMapper step on and off (`setOutputValidation`) and keeping it in sync
 * when the target schema changes (`syncOnTargetChange`). For that it combines
 *  - {@link XmlSchemaWrapperGeneratorService} (pure: decides which resource to validate against),
 *  - {@link DataMapperMetadataService} (resource I/O: loads schemas, persists and deletes the wrapper files),
 *  - {@link DataMapperValidationStepService} (pure: mutates the Camel model).
 *
 * The other lifecycle events of the wrapper (copy on duplicate/paste, move on rename, delete with the step) are
 * handled by {@link DataMapperMetadataService} together with `DataMapperStepService`.
 *
 * All I/O is awaited first and the Camel model is mutated synchronously last. `addValidationStep` re-checks for an
 * existing validator after the awaits, so a concurrent toggle can not add a second validator step. A vizNode edited
 * by someone else in between is not detected.
 *
 * No wrapper is written for a step that can not get a validator (no XSLT step), so no orphan wrapper is left behind.
 */
export class DataMapperOutputValidationService {
  /**
   * Resolves the resource the validator step has to point to for the given target body.
   * With several unconnected XML schema files a wrapper schema is generated and persisted next to the XSLT file.
   * In every other case the first schema file is used and a stale wrapper (e.g. left after going from several
   * schema files to one) is removed.
   *
   * Problems (missing files, analysis errors, fallbacks, a wrapper that could not be saved) are reported with one
   * `console.warn`; the caller still gets a usable URI.
   *
   * @param api The metadata API
   * @param targetMetadata The target body metadata
   * @param xsltPath The path of the XSLT file the wrapper belongs to
   * @param definitionFiles The loaded content of the target schema files. Unreadable or empty files are missing.
   * @returns The resource URI for the validator, empty when there is nothing to validate against
   */
  static async resolveValidationResource(
    api: IMetadataApi,
    targetMetadata: IDocumentMetadata,
    xsltPath: string,
    definitionFiles: Record<string, string>,
  ): Promise<string> {
    const defaultUri = targetMetadata.filePath?.[0] ?? '';
    const filePaths = targetMetadata.filePath ?? [];

    if (!DataMapperOutputValidationService.requiresWrapperResolution(targetMetadata) || !xsltPath) {
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
      xsltPath,
    );
    warnings.push(...result.warnings);

    let uri: string;
    if (result.kind === 'wrapper') {
      const failure = await DataMapperMetadataService.saveValidationWrapper(
        api,
        xsltPath,
        result.xsd,
        result.aggregators,
      );
      if (failure) {
        warnings.push(
          `Could not save the validation wrapper (${failure}): validating against "${defaultUri}" only, which rejects valid output using the other schema files`,
        );
      }
      uri = failure ? defaultUri : result.uri;
    } else {
      await DataMapperMetadataService.deleteValidationWrapper(api, xsltPath);
      uri = result.uri || defaultUri;
    }

    if (warnings.length > 0) {
      console.warn(`[Output validation] ${warnings.join(' | ')}`);
    }
    return uri;
  }

  /**
   * Only several XML schema files can need a generated wrapper schema; everything else validates against the first file.
   */
  private static requiresWrapperResolution(targetMetadata: IDocumentMetadata): boolean {
    return targetMetadata.type === DocumentDefinitionType.XML_SCHEMA && (targetMetadata.filePath?.length ?? 0) > 1;
  }

  /**
   * Enables or disables output validation for a DataMapper step. Resolves the metadata and the schema files itself,
   * so callers only pass the step.
   * @param api The metadata API
   * @param vizNode The DataMapper step
   * @param enabled Whether the validator step should exist afterwards
   * @param entitiesContext The entities context
   */
  static async setOutputValidation(
    api: IMetadataApi,
    vizNode: IVisualizationNode,
    enabled: boolean,
    entitiesContext: EntitiesContextResult,
  ): Promise<void> {
    const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);
    const metadata = await api.getMetadata<IDataMapperMetadata>(metadataId);

    if (!enabled) {
      DataMapperValidationStepService.removeValidationStep(vizNode, entitiesContext);
      if (metadata?.xsltPath) {
        await DataMapperMetadataService.deleteValidationWrapper(api, metadata.xsltPath);
      }
      return;
    }

    if (!metadata || !DataMapperValidationStepService.canAddValidationStep(vizNode)) return;

    const { targetBody, xsltPath } = metadata;
    const definitionFiles = DataMapperOutputValidationService.requiresWrapperResolution(targetBody)
      ? ((await DataMapperMetadataService.loadTargetBodyDefinition(api, metadata)).definitionFiles ?? {})
      : {};
    const resourceUri = await DataMapperOutputValidationService.resolveValidationResource(
      api,
      targetBody,
      xsltPath,
      definitionFiles,
    );

    DataMapperValidationStepService.addValidationStep(vizNode, targetBody, entitiesContext, resourceUri);
  }

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
  static async syncOnTargetChange(
    api: IMetadataApi,
    vizNode: IVisualizationNode,
    entitiesContext: EntitiesContextResult,
    metadata: IDataMapperMetadata,
    definition: DocumentDefinition,
    previousType: DocumentDefinitionType | undefined,
  ): Promise<boolean> {
    const isEnabled = DataMapperValidationStepService.isValidationEnabled(vizNode);
    const { targetBody, xsltPath } = metadata;
    const isTargetPrimitive = definition.definitionType === DocumentDefinitionType.Primitive;
    const definitionFiles = definition.definitionFiles ?? {};
    const resolveResource = () =>
      DataMapperOutputValidationService.resolveValidationResource(api, targetBody, xsltPath, definitionFiles);

    if (isEnabled && isTargetPrimitive) {
      // `updateValidationStep` removes the validator for a Primitive target.
      DataMapperValidationStepService.updateValidationStep(vizNode, targetBody, entitiesContext);
      await DataMapperMetadataService.deleteValidationWrapper(api, xsltPath);
    } else if (isEnabled) {
      const resourceUri = await resolveResource();
      DataMapperValidationStepService.updateValidationStep(vizNode, targetBody, entitiesContext, resourceUri);
    } else if (
      (previousType === undefined || previousType === DocumentDefinitionType.Primitive) &&
      !isTargetPrimitive &&
      DataMapperValidationStepService.canAddValidationStep(vizNode)
    ) {
      const resourceUri = await resolveResource();
      DataMapperValidationStepService.addValidationStep(vizNode, targetBody, entitiesContext, resourceUri);
    }

    return DataMapperValidationStepService.isValidationEnabled(vizNode);
  }
}
