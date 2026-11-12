import { ProcessorDefinition, Step } from '@kaoto/camel-catalog/types';

import { getCamelRandomId } from '../camel-utils/camel-random-id';
import { IVisualizationNode } from '../models';
import { DocumentDefinitionType } from '../models/datamapper/document';
import { IDocumentMetadata } from '../models/datamapper/metadata';
import { EntitiesContextResult } from '../providers';
import {
  CamelUriHelper,
  isJsonValidatorComponent,
  isValidatorComponent,
  isXSLTComponent,
  JSON_VALIDATOR_COMPONENT_NAME,
  VALIDATOR_COMPONENT_NAME,
} from '../utils';
import type { ValidatorComponentDef } from '../utils/is-validator-component';
import { XmlSchemaWrapperGeneratorService } from './document/xml-schema/xml-schema-wrapper-generator.service';

/**
 * Service for managing the validation step within a DataMapper step group.
 *
 * When output validation is enabled, a validator step is added after the XSLT step:
 * ```yaml
 * - step:
 *     id: kaoto-datamapper-xxxxxxxx
 *     steps:
 *       - to:
 *           uri: xslt-saxon:kaoto-datamapper-xxxxxxxx.xsl
 *       - to:
 *           uri: validator:ShipOrder.xsd
 * ```
 *
 * This service only mutates the Camel model. It does not touch any resource file: the resource URI
 * the validator points to (a schema file or a generated wrapper schema) is resolved by the caller,
 * see `DataMapperOutputValidationService`.
 *
 * This service handles:
 * - Adding/removing the validation step (validator or json-validator)
 * - Updating the validation resource URI when the target schema changes
 * - Detecting whether validation is currently enabled
 */
export class DataMapperValidationStepService {
  /** A step is a validation step when it is either the XML or the JSON validator component. */
  private static isAnyValidatorComponent(step: ProcessorDefinition): step is ValidatorComponentDef {
    return isValidatorComponent(step) || isJsonValidatorComponent(step);
  }

  /**
   * Gets the validation step from a DataMapper step group definition, if present.
   * @param definition The step group definition (the `definition` of the DataMapper visualization node)
   * @returns The validator step definition, or `undefined` if none exists
   */
  static getValidationStepFromDefinition(definition: Step | undefined): ValidatorComponentDef | undefined {
    return definition?.steps?.find(DataMapperValidationStepService.isAnyValidatorComponent);
  }

  /**
   * Gets the validation step from the DataMapper step group, if present.
   * @param vizNode The visualization node representing the DataMapper step
   * @returns The validator step definition, or `undefined` if none exists
   */
  static getValidationStep(vizNode: IVisualizationNode): ValidatorComponentDef | undefined {
    return DataMapperValidationStepService.getValidationStepFromDefinition(
      vizNode.data?.definition as Step | undefined,
    );
  }

  /**
   * Checks whether a validation step is currently present in the DataMapper step group.
   * @param vizNode The visualization node representing the DataMapper step
   * @returns `true` if a validator or json-validator step is present, `false` otherwise
   */
  static isValidationEnabled(vizNode: IVisualizationNode): boolean {
    return DataMapperValidationStepService.getValidationStep(vizNode) !== undefined;
  }

  /**
   * Checks whether a validation step can be added: the DataMapper step group has an XSLT step to insert it after.
   * @param vizNode The visualization node representing the DataMapper step
   */
  static canAddValidationStep(vizNode: IVisualizationNode): boolean {
    const steps = (vizNode.data?.definition as Step | undefined)?.steps;
    return steps?.some((s) => isXSLTComponent(s)) ?? false;
  }

  /**
   * Adds a validation step after the XSLT step in the DataMapper step group.
   * Uses `validator` for XML_SCHEMA targets and `json-validator` for JSON_SCHEMA targets.
   * Does nothing for Primitive targets or when there is no resource to validate against.
   * @param vizNode The visualization node representing the DataMapper step
   * @param targetMetadata The metadata for the target document schema
   * @param entitiesContext The entities context for updating source code
   * @param resourceUri The resource the validator points to. Defaults to the first schema file; pass a
   * different value when the validation uses a generated wrapper schema.
   */
  static addValidationStep(
    vizNode: IVisualizationNode,
    targetMetadata: IDocumentMetadata,
    entitiesContext: EntitiesContextResult,
    resourceUri: string | undefined = targetMetadata.filePath?.[0],
  ): void {
    const validator = DataMapperValidationStepService.resolveValidator(targetMetadata.type);
    if (!validator) {
      return;
    }

    if (!resourceUri) {
      return;
    }

    if (DataMapperValidationStepService.getValidationStep(vizNode)) {
      return;
    }

    const model = vizNode.data?.definition as Step | undefined;
    const steps = model?.steps;
    const xsltIndex = steps?.findIndex((s) => isXSLTComponent(s)) ?? -1;
    if (!model || !steps || xsltIndex < 0) {
      return;
    }

    const newStep = {
      to: { id: getCamelRandomId(validator.idPrefix), uri: `${validator.componentName}:${resourceUri}` },
    };
    steps.splice(xsltIndex + 1, 0, newStep);
    vizNode.updateModel(model);
    entitiesContext.updateSourceCodeFromEntities();
  }

  /**
   * Removes the validation step from the DataMapper step group, if present.
   * Does nothing if no validator step exists.
   * @param vizNode The visualization node representing the DataMapper step
   * @param entitiesContext The entities context for updating source code
   */
  static removeValidationStep(vizNode: IVisualizationNode, entitiesContext: EntitiesContextResult): void {
    const model = vizNode.data?.definition as Step | undefined;
    const steps = model?.steps;
    const index = steps?.findIndex(DataMapperValidationStepService.isAnyValidatorComponent);
    if (!model || !steps || index === undefined || index < 0) {
      return;
    }
    steps.splice(index, 1);
    vizNode.updateModel(model);
    entitiesContext.updateSourceCodeFromEntities();
  }

  /**
   * Updates the validation step when the target schema changes.
   * Handles both URI updates (same component type) and component swaps (XML↔JSON).
   * Removes the validation step if the target becomes Primitive.
   * Does nothing if no validation step exists.
   * @param vizNode The visualization node representing the DataMapper step
   * @param targetMetadata The metadata for the updated target document schema
   * @param entitiesContext The entities context for updating source code
   * @param resourceUri The resource the validator points to. Defaults to the first schema file; pass a
   * different value when the validation uses a generated wrapper schema.
   */
  static updateValidationStep(
    vizNode: IVisualizationNode,
    targetMetadata: IDocumentMetadata,
    entitiesContext: EntitiesContextResult,
    resourceUri: string | undefined = targetMetadata.filePath?.[0],
  ): void {
    const existingStep = DataMapperValidationStepService.getValidationStep(vizNode);
    if (!existingStep) {
      return;
    }

    if (targetMetadata.type === DocumentDefinitionType.Primitive) {
      DataMapperValidationStepService.removeValidationStep(vizNode, entitiesContext);
      return;
    }

    if (!resourceUri) {
      return;
    }

    const validator = DataMapperValidationStepService.resolveValidator(targetMetadata.type);
    if (!validator) {
      return;
    }

    const current = DataMapperValidationStepService.parseValidatorUri(existingStep.to.uri);
    // Skip if nothing changed: the query options are not part of the comparison
    if (current.componentName === validator.componentName && current.resource === resourceUri) {
      return;
    }

    const model = vizNode.data?.definition;
    if (current.componentName !== validator.componentName) {
      existingStep.to.id = getCamelRandomId(validator.idPrefix);
    }
    existingStep.to.uri = `${validator.componentName}:${resourceUri}${current.options}`;
    vizNode.updateModel(model);
    entitiesContext.updateSourceCodeFromEntities();
  }

  /**
   * Resolves the validator component and the step id prefix for a target document type.
   * @returns `undefined` when the target type (e.g. Primitive) has no validator
   */
  private static resolveValidator(
    type: DocumentDefinitionType,
  ): { componentName: string; idPrefix: string } | undefined {
    switch (type) {
      case DocumentDefinitionType.XML_SCHEMA:
        return { componentName: VALIDATOR_COMPONENT_NAME, idPrefix: 'kaoto-datamapper-validator' };
      case DocumentDefinitionType.JSON_SCHEMA:
        return { componentName: JSON_VALIDATOR_COMPONENT_NAME, idPrefix: 'kaoto-datamapper-json-validator' };
      default:
        return undefined;
    }
  }

  /**
   * Splits a validator URI into its component, the resource and the query options.
   * `validator:foo-validation-wrapper.xsd?failOnNullBody=false` gives `validator`, `foo-validation-wrapper.xsd`
   * and `?failOnNullBody=false`.
   */
  private static parseValidatorUri(uri: string): { componentName: string; resource: string; options: string } {
    const { componentName } = CamelUriHelper.getComponentAndKameletName(uri);
    if (!componentName) {
      return { componentName: '', resource: uri, options: '' };
    }
    const rest = uri.substring(componentName.length + 1);
    const optionsIndex = rest.indexOf('?');
    return optionsIndex < 0
      ? { componentName, resource: rest, options: '' }
      : { componentName, resource: rest.substring(0, optionsIndex), options: rest.substring(optionsIndex) };
  }

  /**
   * Points the validation step of a plain step definition to another resource, but only when it
   * currently points to `fromResource`. The query options of the URI are kept and are not part of the comparison.
   * Used when a DataMapper step is copied or renamed and the generated wrapper schema it validates against moves
   * with it. The caller persists the definition.
   * @param definition The step group definition
   * @param fromResource The resource the validator is expected to point to now
   * @param toResource The resource the validator should point to
   * @returns `true` when the validator was retargeted
   */
  static retargetValidationResource(definition: Step | undefined, fromResource: string, toResource: string): boolean {
    const validatorStep = DataMapperValidationStepService.getValidationStepFromDefinition(definition);
    if (!validatorStep) {
      return false;
    }
    const { componentName, resource, options } = DataMapperValidationStepService.parseValidatorUri(
      validatorStep.to.uri,
    );
    if (resource !== fromResource) {
      return false;
    }
    validatorStep.to.uri = `${componentName}:${toResource}${options}`;
    return true;
  }

  /**
   * Removes the validation step of a plain step definition when it points to the generated wrapper schema of the
   * given XSLT file. Used for a copy of a DataMapper step that did not get a wrapper of its own: the validator
   * would otherwise keep pointing to a wrapper that belongs to (or is deleted with) the original step.
   * The caller persists the definition.
   * @param definition The step group definition
   * @param xsltPath The XSLT file path whose wrapper the validator must not use
   * @returns `true` when the validator was removed
   */
  static removeWrapperValidation(definition: Step | undefined, xsltPath: string): boolean {
    const steps = definition?.steps;
    if (!steps || !xsltPath) {
      return false;
    }
    const wrapperPath = XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath);
    const index = steps.findIndex(
      (step) =>
        DataMapperValidationStepService.isAnyValidatorComponent(step) &&
        DataMapperValidationStepService.parseValidatorUri(step.to.uri).resource === wrapperPath,
    );
    if (index < 0) {
      return false;
    }
    steps.splice(index, 1);
    return true;
  }
}
