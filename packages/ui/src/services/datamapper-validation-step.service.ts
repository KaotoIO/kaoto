import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { getCamelRandomId } from '../camel-utils/camel-random-id';
import { IVisualizationNode } from '../models';
import { DocumentDefinitionType } from '../models/datamapper/document';
import { IDocumentMetadata } from '../models/datamapper/metadata';
import { EntitiesContextResult } from '../providers';
import {
  isJsonValidatorComponent,
  isValidatorComponent,
  isXSLTComponent,
  JSON_VALIDATOR_COMPONENT_NAME,
  VALIDATOR_COMPONENT_NAME,
} from '../utils';
import type { ValidatorComponentDef } from '../utils/is-validator-component';

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
 * see `on-output-validation.ts`.
 *
 * This service handles:
 * - Adding/removing the validation step (validator or json-validator)
 * - Updating the validation resource URI when the target schema changes
 * - Detecting whether validation is currently enabled
 */
export class DataMapperValidationStepService {
  /**
   * Gets the validation step from a DataMapper step group definition, if present.
   * @param definition The step group definition (the `definition` of the DataMapper visualization node)
   * @returns The validator step definition, or `undefined` if none exists
   */
  static getValidationStepFromDefinition(definition: unknown): ValidatorComponentDef | undefined {
    const steps = (definition as { steps?: ProcessorDefinition[] } | undefined)?.steps;
    return steps?.find((s): s is ValidatorComponentDef => isValidatorComponent(s) || isJsonValidatorComponent(s));
  }

  /**
   * Gets the validation step from the DataMapper step group, if present.
   * @param vizNode The visualization node representing the DataMapper step
   * @returns The validator step definition, or `undefined` if none exists
   */
  static getValidationStep(vizNode: IVisualizationNode): ValidatorComponentDef | undefined {
    return DataMapperValidationStepService.getValidationStepFromDefinition(vizNode.data?.definition);
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
    let componentName: string;
    let idPrefix: string;

    switch (targetMetadata.type) {
      case DocumentDefinitionType.XML_SCHEMA:
        componentName = VALIDATOR_COMPONENT_NAME;
        idPrefix = 'kaoto-datamapper-validator';
        break;
      case DocumentDefinitionType.JSON_SCHEMA:
        componentName = JSON_VALIDATOR_COMPONENT_NAME;
        idPrefix = 'kaoto-datamapper-json-validator';
        break;
      default:
        return;
    }

    if (!resourceUri) {
      return;
    }

    if (DataMapperValidationStepService.getValidationStep(vizNode)) {
      return;
    }

    const model = vizNode.data?.definition as Record<string, unknown>;
    const steps = model.steps as ProcessorDefinition[] | undefined;
    const xsltIndex = steps?.findIndex((s) => isXSLTComponent(s)) ?? -1;
    if (!steps || xsltIndex < 0) {
      return;
    }

    const newStep = { to: { id: getCamelRandomId(idPrefix), uri: `${componentName}:${resourceUri}` } };
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
    const model = vizNode.data?.definition as Record<string, unknown>;
    const steps = model.steps as ProcessorDefinition[];
    const index = steps?.findIndex((s) => isValidatorComponent(s) || isJsonValidatorComponent(s));
    if (index === undefined || index < 0) {
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

    let componentName: string;
    switch (targetMetadata.type) {
      case DocumentDefinitionType.XML_SCHEMA:
        componentName = VALIDATOR_COMPONENT_NAME;
        break;
      case DocumentDefinitionType.JSON_SCHEMA:
        componentName = JSON_VALIDATOR_COMPONENT_NAME;
        break;
      default:
        return;
    }

    const currentUri = existingStep.to.uri;
    // Skip if nothing changed
    if (currentUri === `${componentName}:${resourceUri}`) {
      return;
    }

    const model = vizNode.data?.definition;
    const currentComponent = currentUri.split(':')[0];
    if (currentComponent !== componentName) {
      existingStep.to.id = getCamelRandomId(
        componentName === JSON_VALIDATOR_COMPONENT_NAME
          ? 'kaoto-datamapper-json-validator'
          : 'kaoto-datamapper-validator',
      );
    }
    existingStep.to.uri = `${componentName}:${resourceUri}`;
    vizNode.updateModel(model);
    entitiesContext.updateSourceCodeFromEntities();
  }

  /**
   * Points the validation step of a plain step definition to another resource, but only when it
   * currently points to `fromResource`. Used when a DataMapper step is copied or renamed and the
   * generated wrapper schema it validates against moves with it. The caller persists the definition.
   * @param definition The step group definition
   * @param fromResource The resource the validator is expected to point to now
   * @param toResource The resource the validator should point to
   * @returns `true` when the validator was retargeted
   */
  static retargetValidationResource(definition: unknown, fromResource: string, toResource: string): boolean {
    const validatorStep = DataMapperValidationStepService.getValidationStepFromDefinition(definition);
    if (!validatorStep) {
      return false;
    }
    const currentUri = validatorStep.to.uri;
    const componentName = currentUri.split(':')[0];
    if (currentUri.substring(componentName.length + 1) !== fromResource) {
      return false;
    }
    validatorStep.to.uri = `${componentName}:${toResource}`;
    return true;
  }
}
