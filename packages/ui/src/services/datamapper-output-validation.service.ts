import { IVisualizationNode } from '../models';
import { DocumentDefinition, DocumentDefinitionType } from '../models/datamapper/document';
import { IDataMapperMetadata, IDocumentMetadata } from '../models/datamapper/metadata';
import { EntitiesContextResult, IMetadataApi } from '../providers';
import { DataMapperMetadataService } from './datamapper-metadata.service';
import { DataMapperStepService } from './datamapper-step.service';
import { DataMapperValidationStepService } from './datamapper-validation-step.service';
import {
  XmlSchemaWrapperGeneratorService,
  XmlValidationUri,
} from './document/xml-schema/xml-schema-wrapper-generator.service';

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
 *
 * The two entry points of one step run one after the other, in the order they were called: a target change can not
 * write a wrapper after a toggle-off deleted it, and a second Save can not read the model before the first finished.
 */
const JSON_VALIDATION_UNSUPPORTED_MESSAGE = 'Output validation for JSON schemas is not supported yet.';

export class DataMapperOutputValidationService {
  /** The last queued operation of each step, by metadata id. Its rejection is absorbed; entries do not outlive it. */
  private static readonly queues = new Map<string, Promise<unknown>>();

  /**
   * Runs `task` after every operation queued before it for the same step settled, whether it resolved or rejected.
   * The caller gets the real result or error of its own task.
   */
  private static runExclusive<T>(metadataId: string, task: () => Promise<T>): Promise<T> {
    const queues = DataMapperOutputValidationService.queues;
    const result = (queues.get(metadataId) ?? Promise.resolve()).then(task);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    queues.set(metadataId, tail);
    void tail.then(() => {
      if (queues.get(metadataId) === tail) queues.delete(metadataId);
    });
    return result;
  }

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
   * @param reportedWarnings Optional list the problems are also appended to, so the caller can show them to the user
   * @returns The resource URI for the validator, empty when there is nothing to validate against
   */
  static async resolveValidationResource(
    api: IMetadataApi,
    targetMetadata: IDocumentMetadata,
    xsltPath: string,
    definitionFiles: Record<string, string>,
    reportedWarnings?: string[],
  ): Promise<string> {
    const { uri, deleteStaleWrapper } = await DataMapperOutputValidationService.resolveValidationResourceDeferred(
      api,
      targetMetadata,
      xsltPath,
      definitionFiles,
      reportedWarnings,
    );
    await deleteStaleWrapper();
    return uri;
  }

  /**
   * Same as {@link resolveValidationResource}, but a wrapper the new `uri` no longer needs is not deleted yet:
   * the caller gets it back as `deleteStaleWrapper` to call once the validator step points to `uri`, so an
   * interruption in between leaves an orphan file rather than a step pointing at a file that no longer exists.
   */
  private static async resolveValidationResourceDeferred(
    api: IMetadataApi,
    targetMetadata: IDocumentMetadata,
    xsltPath: string,
    definitionFiles: Record<string, string>,
    reportedWarnings?: string[],
  ): Promise<{ uri: string; deleteStaleWrapper: () => Promise<void> }> {
    const defaultUri = targetMetadata.filePath?.[0] ?? '';
    const deleteStaleWrapper = () => DataMapperMetadataService.deleteValidationWrapper(api, xsltPath);

    // Nothing here can need a wrapper: the single schema file is enough.
    if (!DataMapperOutputValidationService.requiresWrapperResolution(targetMetadata) || !xsltPath) {
      return { uri: defaultUri, deleteStaleWrapper };
    }

    const warnings = DataMapperOutputValidationService.collectMissingFileWarnings(targetMetadata, definitionFiles);
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(
      { definitionFiles, rootElement: targetMetadata.rootElementChoice },
      XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath),
      xsltPath,
    );
    warnings.push(...result.warnings);

    const { uri, keepsWrapper } = await DataMapperOutputValidationService.persistValidationUri(
      api,
      xsltPath,
      result,
      defaultUri,
      warnings,
    );

    if (warnings.length > 0) {
      console.warn(`[Output validation] ${warnings.join(' | ')}`);
      reportedWarnings?.push(...warnings);
    }
    return { uri, deleteStaleWrapper: keepsWrapper ? () => Promise.resolve() : deleteStaleWrapper };
  }

  /** A file that could not be read takes no part in the validation. */
  private static collectMissingFileWarnings(
    targetMetadata: IDocumentMetadata,
    definitionFiles: Record<string, string>,
  ): string[] {
    const missing = (targetMetadata.filePath ?? []).filter((path) => !(path in definitionFiles));
    return missing.length === 0
      ? []
      : [
          `Schema file(s) missing or empty, not included in validation: ${missing.join(', ')}. Re-attach the missing file(s) to validate against the full schema.`,
        ];
  }

  /**
   * Writes the wrapper and returns the URI the validator has to point to, plus whether a wrapper from a previous
   * resolution should be kept (the caller deletes it once it is safe to, see {@link resolveValidationResourceDeferred}).
   * A wrapper that could not be written falls back to `defaultUri`, keeping whatever wrapper file is already there.
   */
  private static async persistValidationUri(
    api: IMetadataApi,
    xsltPath: string,
    result: XmlValidationUri,
    defaultUri: string,
    warnings: string[],
  ): Promise<{ uri: string; keepsWrapper: boolean }> {
    if (result.kind !== 'wrapper') {
      return { uri: result.uri || defaultUri, keepsWrapper: false };
    }

    const failure = await DataMapperMetadataService.saveValidationWrapper(
      api,
      xsltPath,
      result.xsd,
      result.aggregators,
    );
    if (!failure) return { uri: result.uri, keepsWrapper: true };

    warnings.push(
      `Could not save the validation wrapper (${failure}): validating against "${defaultUri}" only, which rejects valid output using the other schema files. Fix the save error and toggle validation off and on again to retry.`,
    );
    return { uri: defaultUri, keepsWrapper: true };
  }

  /**
   * Only several XML schema files can need a generated wrapper schema; everything else validates against the first file.
   */
  private static requiresWrapperResolution(targetMetadata: IDocumentMetadata): boolean {
    return targetMetadata.type === DocumentDefinitionType.XML_SCHEMA && (targetMetadata.filePath?.length ?? 0) > 1;
  }

  /**
   * Whether output validation can be turned on for a target of this type. Only XML Schema qualifies for now;
   * JSON is gated until #3612 (wrapper resolution and the `validator`/`json-validator` swap are XML-only).
   * Takes the plain type rather than a metadata or document object so the sync and the UI controls can share it.
   */
  static isValidationSupported(targetType: DocumentDefinitionType): boolean {
    return targetType === DocumentDefinitionType.XML_SCHEMA;
  }

  /**
   * A human-readable reason the output-validation control is disabled for this target type, or `undefined` when
   * the target supports it (see `isValidationSupported`). Shared by the Launcher and the Settings modal so the
   * copy lives in one place.
   */
  static describeUnsupportedValidation(targetType: DocumentDefinitionType): string | undefined {
    if (DataMapperOutputValidationService.isValidationSupported(targetType)) return undefined;
    return targetType === DocumentDefinitionType.JSON_SCHEMA
      ? JSON_VALIDATION_UNSUPPORTED_MESSAGE
      : 'Attach a target schema to enable validation.';
  }

  /**
   * Enables or disables output validation for a DataMapper step. Resolves the metadata and the schema files itself,
   * so callers only pass the step.
   * @param api The metadata API
   * @param vizNode The DataMapper step
   * @param enabled Whether the validator step should exist afterwards
   * @param entitiesContext The entities context
   * @param skipIfUnchanged Do nothing, and read nothing, when the step already is in the requested state. Without
   *        it a disable of a step without validator still removes a stale generated wrapper; enabling an already
   *        enabled step is skipped for every caller. The state is read when the call runs, after the earlier calls
   *        for the step finished, not when it was made.
   * @returns The problems found while resolving the schema to validate against (e.g. validating against a part of
   *          the schema files only), empty when there are none
   */
  static setOutputValidation(
    api: IMetadataApi,
    vizNode: IVisualizationNode,
    enabled: boolean,
    entitiesContext: EntitiesContextResult,
    skipIfUnchanged = false,
  ): Promise<string[]> {
    const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);
    return DataMapperOutputValidationService.runExclusive(metadataId, () =>
      DataMapperOutputValidationService.applySetOutputValidation(
        api,
        vizNode,
        enabled,
        entitiesContext,
        skipIfUnchanged,
      ),
    );
  }

  private static async applySetOutputValidation(
    api: IMetadataApi,
    vizNode: IVisualizationNode,
    enabled: boolean,
    entitiesContext: EntitiesContextResult,
    skipIfUnchanged: boolean,
  ): Promise<string[]> {
    // Enabling an enabled step changes nothing. A disable also removes a stale wrapper, so it is skipped only when
    // the caller asked for it.
    const isEnabled = DataMapperValidationStepService.isValidationEnabled(vizNode);
    if (isEnabled === enabled && (enabled || skipIfUnchanged)) return [];

    const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);
    const metadata = await api.getMetadata<IDataMapperMetadata>(metadataId);

    if (!enabled) {
      DataMapperValidationStepService.removeValidationStep(vizNode, entitiesContext);
      if (metadata?.xsltPath) {
        await DataMapperMetadataService.deleteValidationWrapper(api, metadata.xsltPath);
      }
      return [];
    }

    if (!metadata || !DataMapperValidationStepService.canAddValidationStep(vizNode)) return [];

    const { targetBody, xsltPath } = metadata;
    if (!DataMapperOutputValidationService.isValidationSupported(targetBody.type)) {
      // Primitive has nothing to validate against (the UI does not even show the toggle for it); a JSON target is
      // gated until #3612, see `isValidationSupported`.
      return targetBody.type === DocumentDefinitionType.JSON_SCHEMA ? [JSON_VALIDATION_UNSUPPORTED_MESSAGE] : [];
    }

    const warnings: string[] = [];
    const definitionFiles = DataMapperOutputValidationService.requiresWrapperResolution(targetBody)
      ? ((await DataMapperMetadataService.loadTargetBodyDefinition(api, metadata)).definitionFiles ?? {})
      : {};
    const resourceUri = await DataMapperOutputValidationService.resolveValidationResource(
      api,
      targetBody,
      xsltPath,
      definitionFiles,
      warnings,
    );

    DataMapperValidationStepService.addValidationStep(vizNode, targetBody, entitiesContext, resourceUri);
    return warnings;
  }

  /**
   * Keeps the validator step in step with the target body after the user changed the target schema.
   * - validation enabled: points the validator to the new schema (or wrapper), removes it for a target
   *   `isValidationSupported` rejects (Primitive, or JSON until #3612 — dropping the `validator` ↔ `json-validator`
   *   swap #3609 added, which #3612 should bring back);
   * - validation disabled: adds the validator when the target changes from none/Primitive to a supported schema
   *   (enabled by default). A user who disabled validation on a schema target keeps it disabled.
   *
   * Call this after the target body metadata has been updated.
   *
   * @param api The metadata API
   * @param vizNode The DataMapper step
   * @param entitiesContext The entities context
   * @param metadata The DataMapper metadata, already updated with the new target body
   * @param definition The new target body definition (the source of the schema file content)
   * @param previousType The target body type before the change
   * @param reportedWarnings Optional list the problems found while resolving the schema are appended to, so the
   *        caller can show them to the user
   * @returns Whether validation is enabled afterwards
   */
  static syncOnTargetChange(
    api: IMetadataApi,
    vizNode: IVisualizationNode,
    entitiesContext: EntitiesContextResult,
    metadata: IDataMapperMetadata,
    definition: DocumentDefinition,
    previousType?: DocumentDefinitionType,
    reportedWarnings?: string[],
  ): Promise<boolean> {
    const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);
    // The host reassigns `targetBody` on its metadata object for every target change. A queued run must keep the
    // `targetBody` that belongs to the `definition` it was called with.
    const snapshot = { ...metadata };
    return DataMapperOutputValidationService.runExclusive(metadataId, () =>
      DataMapperOutputValidationService.applySyncOnTargetChange(
        api,
        vizNode,
        entitiesContext,
        snapshot,
        definition,
        previousType,
        reportedWarnings,
      ),
    );
  }

  private static async applySyncOnTargetChange(
    api: IMetadataApi,
    vizNode: IVisualizationNode,
    entitiesContext: EntitiesContextResult,
    metadata: IDataMapperMetadata,
    definition: DocumentDefinition,
    previousType?: DocumentDefinitionType,
    reportedWarnings?: string[],
  ): Promise<boolean> {
    const { targetBody, xsltPath } = metadata;
    const isTargetSupported = DataMapperOutputValidationService.isValidationSupported(targetBody.type);
    const definitionFiles = definition.definitionFiles ?? {};
    // Deferred: the model is repointed to the resolved URI before a wrapper it no longer needs is deleted, so an
    // interruption in between leaves an orphan file rather than the step pointing at a deleted one.
    const resolveResource = () =>
      DataMapperOutputValidationService.resolveValidationResourceDeferred(
        api,
        targetBody,
        xsltPath,
        definitionFiles,
        reportedWarnings,
      );

    if (DataMapperValidationStepService.isValidationEnabled(vizNode)) {
      if (isTargetSupported) {
        const { uri, deleteStaleWrapper } = await resolveResource();
        DataMapperValidationStepService.updateValidationStep(vizNode, targetBody, entitiesContext, uri);
        await deleteStaleWrapper();
      } else {
        // Primitive has nothing to validate against; a JSON target is gated until #3612 (see `isValidationSupported`).
        DataMapperValidationStepService.removeValidationStep(vizNode, entitiesContext);
        await DataMapperMetadataService.deleteValidationWrapper(api, xsltPath);
      }
    } else if (
      isTargetSupported &&
      DataMapperOutputValidationService.shouldEnableOnTargetChange(vizNode, previousType)
    ) {
      const { uri, deleteStaleWrapper } = await resolveResource();
      DataMapperValidationStepService.addValidationStep(vizNode, targetBody, entitiesContext, uri);
      await deleteStaleWrapper();
    }

    return DataMapperValidationStepService.isValidationEnabled(vizNode);
  }

  /**
   * Validation is on by default the first time the target becomes a supported schema. `previousType` is only the
   * type right before this change, not a persisted opt-out flag, so a detach-then-reattach re-enables a validator
   * the user turned off (accepted until #4408 lets the user opt out explicitly at attach time).
   */
  private static shouldEnableOnTargetChange(
    vizNode: IVisualizationNode,
    previousType?: DocumentDefinitionType,
  ): boolean {
    const hadNoValidatedTarget =
      previousType === undefined || !DataMapperOutputValidationService.isValidationSupported(previousType);
    return hadNoValidatedTarget && DataMapperValidationStepService.canAddValidationStep(vizNode);
  }
}
