import { IVisualizationNode } from '../models';
import { DocumentDefinition, DocumentDefinitionType } from '../models/datamapper/document';
import { IDataMapperMetadata } from '../models/datamapper/metadata';
import { IStepSettings, IStepSettingsResult } from '../models/datamapper/settings';
import { EntitiesContextResult, IMetadataApi } from '../providers';
import { DataMapperOutputValidationService } from './datamapper-output-validation.service';
import { DataMapperStepService } from './datamapper-step.service';
import { DataMapperValidationStepService } from './datamapper-validation-step.service';

/**
 * Applies the Camel step-level settings of a DataMapper step ({@link IStepSettings}) and keeps them in step with
 * the target schema. It is the only place the hosts (`DataMapper`, `DataMapperLauncher`) talk to for this, so a new
 * step setting does not need new apply or sync logic in a host.
 *
 * Not to be confused with `DataMapperSettingsService`, which holds pure functions over the combined
 * `IDataMapperSettings` object (patch merge, sanitising per target, XSL change detection). This service changes the
 * Camel step and does resource I/O.
 *
 * Problems are returned in an {@link IStepSettingsResult} instead of being logged, so they can reach the user. The
 * `console.warn` calls here are for developers only.
 */
export class DataMapperStepSettingsService {
  /** The settings the step really holds. */
  static getStepSettings(vizNode: IVisualizationNode): IStepSettings {
    return {
      outputVariable: DataMapperStepService.getOutputVariable(vizNode),
      isOutputValidationEnabled: DataMapperValidationStepService.isValidationEnabled(vizNode),
    };
  }

  /**
   * Applies the settings to the step. The output variable is written first. A failure of the validation toggle does
   * not reject: the model may already hold the new output variable, so the real state is returned with the error.
   * A failed output variable write rejects, as it is not a validation problem.
   * The validation service is called for every update, whatever changed, and does nothing, and reads nothing, when
   * the step already is in the requested state. It decides that when its turn comes, after the earlier updates of
   * the step finished, so two overlapping updates end with the settings of the newer one.
   * @param api The metadata API
   * @param vizNode The DataMapper step
   * @param entitiesContext The entities context
   * @param settings The requested settings
   * @returns The settings the step holds afterwards, the warnings to show and the error when the toggle failed
   */
  static async updateStepSettings(
    api: IMetadataApi,
    vizNode: IVisualizationNode,
    entitiesContext: EntitiesContextResult,
    settings: IStepSettings,
  ): Promise<IStepSettingsResult> {
    DataMapperStepService.setOutputVariable(vizNode, settings.outputVariable, entitiesContext);

    const warnings: string[] = [];
    let error: string | undefined;
    try {
      warnings.push(
        ...(await DataMapperOutputValidationService.setOutputValidation(
          api,
          vizNode,
          settings.isOutputValidationEnabled,
          entitiesContext,
          true,
        )),
      );
    } catch (cause) {
      const verb = settings.isOutputValidationEnabled ? 'enable' : 'disable';
      console.warn(`[DataMapperStepSettings] Failed to ${verb} output validation:`, cause);
      error = `Could not ${verb} output validation: ${DataMapperStepSettingsService.describe(cause)}`;
    }

    return DataMapperStepSettingsService.toResult(
      DataMapperStepSettingsService.getStepSettings(vizNode),
      warnings,
      error,
    );
  }

  /**
   * Keeps the step in step with the target body after the user changed the target schema. Call this after the
   * target body metadata has been updated. Only the validation can change, so only it is reported back.
   * @param api The metadata API
   * @param vizNode The DataMapper step
   * @param entitiesContext The entities context
   * @param metadata The DataMapper metadata, already updated with the new target body
   * @param definition The new target body definition
   * @param previousType The target body type before the change
   * @returns The validation flag the step holds afterwards, the warnings to show and the error when the sync failed
   */
  static async syncOnTargetChange(
    api: IMetadataApi,
    vizNode: IVisualizationNode,
    entitiesContext: EntitiesContextResult,
    metadata: IDataMapperMetadata,
    definition: DocumentDefinition,
    previousType: DocumentDefinitionType | undefined,
  ): Promise<IStepSettingsResult> {
    const warnings: string[] = [];
    let error: string | undefined;
    try {
      await DataMapperOutputValidationService.syncOnTargetChange(
        api,
        vizNode,
        entitiesContext,
        metadata,
        definition,
        previousType,
        warnings,
      );
    } catch (cause) {
      console.warn('[DataMapperStepSettings] Failed to update output validation:', cause);
      error = `Could not update output validation: ${DataMapperStepSettingsService.describe(cause)}`;
    }

    const { isOutputValidationEnabled } = DataMapperStepSettingsService.getStepSettings(vizNode);
    return DataMapperStepSettingsService.toResult({ isOutputValidationEnabled }, warnings, error);
  }

  private static toResult(
    settings: Partial<IStepSettings>,
    warnings: string[],
    error: string | undefined,
  ): IStepSettingsResult {
    return error === undefined ? { settings, warnings } : { settings, warnings, error };
  }

  private static describe(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
  }
}
