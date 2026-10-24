import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { getCamelRandomId } from '../camel-utils/camel-random-id';
import { IVisualizationNode } from '../models';
import { DocumentDefinitionType } from '../models/datamapper/document';
import { IDocumentMetadata } from '../models/datamapper/metadata';
import { EntitiesContextResult, IMetadataApi } from '../providers';
import {
  isJsonValidatorComponent,
  isValidatorComponent,
  isXSLTComponent,
  JSON_VALIDATOR_COMPONENT_NAME,
  VALIDATOR_COMPONENT_NAME,
} from '../utils';
import type { ValidatorComponentDef } from '../utils/is-validator-component';
import { XmlSchemaWrapperGeneratorService } from './document/xml-schema/xml-schema-wrapper-generator.service';

export async function loadDefinitionFiles(api: IMetadataApi, filePaths: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(filePaths.map(async (p) => [p, (await api.getResourceContent(p)) ?? ''] as const));
  return Object.fromEntries(entries.filter(([, c]) => c !== ''));
}

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
 */
export class DataMapperValidationStepService {
  /**
   * Gets the validation step from the DataMapper step group, if present.
   * @param vizNode The visualization node representing the DataMapper step
   * @returns The validator step definition, or `undefined` if none exists
   */
  static getValidationStep(vizNode: IVisualizationNode): ValidatorComponentDef | undefined {
    const model = vizNode.data?.definition as Record<string, unknown>;
    return (model.steps as ProcessorDefinition[])?.find(
      (s): s is ValidatorComponentDef => isValidatorComponent(s) || isJsonValidatorComponent(s),
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
   * Adds a validation step after the XSLT step in the DataMapper step group.
   * Uses `validator` for XML_SCHEMA targets and `json-validator` for JSON_SCHEMA targets.
   * Does nothing for Primitive targets or when `filePath` is empty.
   * @param vizNode The visualization node representing the DataMapper step
   * @param targetMetadata The metadata for the target document schema
   * @param entitiesContext The entities context for updating source code
   * @param api The metadata API
   * @param xsltPath The path to the XSLT file
   * @param definitionFiles The record of schema files
   */
  static async addValidationStep(
    vizNode: IVisualizationNode,
    targetMetadata: IDocumentMetadata,
    entitiesContext: EntitiesContextResult,
    api: IMetadataApi,
    xsltPath: string,
    definitionFiles: Record<string, string>,
  ): Promise<void> {
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

    // Await all I/O first
    const resourceUri = await DataMapperValidationStepService.resolveResourceUri(
      targetMetadata,
      api,
      xsltPath,
      definitionFiles,
    );
    if (!resourceUri) {
      return;
    }

    // Synchronous model section begins
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
   * @param api The metadata API
   * @param xsltPath The path to the XSLT file
   */
  static async removeValidationStep(
    vizNode: IVisualizationNode,
    entitiesContext: EntitiesContextResult,
    api: IMetadataApi,
    xsltPath: string,
  ): Promise<void> {
    const model = vizNode.data?.definition as Record<string, unknown>;
    const steps = model.steps as ProcessorDefinition[];
    const index = steps?.findIndex((s) => isValidatorComponent(s) || isJsonValidatorComponent(s));
    if (index !== undefined && index >= 0) {
      steps.splice(index, 1);
      vizNode.updateModel(model);
      entitiesContext.updateSourceCodeFromEntities();
    }
    // Clean up after structural update
    await DataMapperValidationStepService.cleanupWrapper(api, xsltPath);
  }

  /**
   * Updates the validation step when the target schema changes.
   * Handles both URI updates (same component type) and component swaps (XML↔JSON).
   * Removes the validation step if the target becomes Primitive.
   * Does nothing if no validation step exists.
   * @param vizNode The visualization node representing the DataMapper step
   * @param targetMetadata The metadata for the updated target document schema
   * @param entitiesContext The entities context for updating source code
   * @param api The metadata API
   * @param xsltPath The path to the XSLT file
   * @param definitionFiles The record of schema files
   */
  static async updateValidationStep(
    vizNode: IVisualizationNode,
    targetMetadata: IDocumentMetadata,
    entitiesContext: EntitiesContextResult,
    api: IMetadataApi,
    xsltPath: string,
    definitionFiles: Record<string, string>,
  ): Promise<void> {
    const existingStep = DataMapperValidationStepService.getValidationStep(vizNode);
    if (!existingStep) {
      return;
    }

    if (targetMetadata.type === DocumentDefinitionType.Primitive) {
      await DataMapperValidationStepService.removeValidationStep(vizNode, entitiesContext, api, xsltPath);
      return;
    }

    // Await all I/O first
    const computedUri = await DataMapperValidationStepService.resolveResourceUri(
      targetMetadata,
      api,
      xsltPath,
      definitionFiles,
    );
    if (!computedUri) {
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
    const currentResource = currentUri.substring(currentUri.indexOf(':') + 1);

    // Skip if nothing changed
    if (currentUri === `${componentName}:${computedUri}`) {
      return;
    }

    // Synchronous model section begins
    const model = vizNode.data?.definition;
    const currentComponent = currentUri.split(':')[0];
    if (currentComponent !== componentName) {
      existingStep.to.id = getCamelRandomId(
        componentName === JSON_VALIDATOR_COMPONENT_NAME
          ? 'kaoto-datamapper-json-validator'
          : 'kaoto-datamapper-validator',
      );
    }
    existingStep.to.uri = `${componentName}:${computedUri}`;
    vizNode.updateModel(model);
    entitiesContext.updateSourceCodeFromEntities();

    // Clean up wrapper if we transition away from it
    const wrapperPath = XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath);
    if (currentResource === wrapperPath && computedUri !== wrapperPath) {
      await DataMapperValidationStepService.cleanupWrapper(api, xsltPath);
    }
  }

  static async cleanupWrapper(api: IMetadataApi | undefined, xsltPath: string | undefined): Promise<void> {
    if (!api || !xsltPath) {
      return;
    }
    try {
      const wrapperPath = XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath);
      const content = await api.getResourceContent(wrapperPath);
      if (content && XmlSchemaWrapperGeneratorService.isGeneratedWrapper(content)) {
        await api.deleteResource(wrapperPath);
      }
    } catch (err) {
      console.log('[DataMapperValidationStepService] Failed to clean up wrapper:', err);
    }
  }

  static async duplicateWrapper(
    api: IMetadataApi | undefined,
    originalXsltPath: string,
    newXsltPath: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stepDef: any,
  ): Promise<void> {
    const originalWrapper = XmlSchemaWrapperGeneratorService.getWrapperPath(originalXsltPath);
    const newWrapper = XmlSchemaWrapperGeneratorService.getWrapperPath(newXsltPath);

    const steps = stepDef.steps as ProcessorDefinition[] | undefined;
    const validatorStep = steps?.find(
      (s): s is ValidatorComponentDef => isValidatorComponent(s) || isJsonValidatorComponent(s),
    );

    if (!api) return;

    try {
      const originalExists = await api.isResourceExist(originalWrapper);
      if (originalExists) {
        const content = await api.getResourceContent(originalWrapper);
        if (content && XmlSchemaWrapperGeneratorService.isGeneratedWrapper(content)) {
          await api.saveResourceContent(newWrapper, content);
          if (validatorStep) {
            const currentUri = validatorStep.to.uri;
            const componentName = currentUri.split(':')[0];
            const resourceUri = currentUri.substring(componentName.length + 1);
            if (resourceUri === originalWrapper) {
              validatorStep.to.uri = `${componentName}:${newWrapper}`;
            }
          }
        }
      }
    } catch (err) {
      console.log('[DataMapperValidationStepService] Failed to duplicate wrapper file:', err);
    }
  }

  private static async resolveResourceUri(
    targetMetadata: IDocumentMetadata,
    api: IMetadataApi,
    xsltPath: string,
    definitionFiles: Record<string, string>,
  ): Promise<string> {
    const defaultUri = targetMetadata.filePath?.[0] || '';
    if (!defaultUri) return '';

    if (!xsltPath) return defaultUri;

    if (
      targetMetadata.type !== DocumentDefinitionType.XML_SCHEMA ||
      !targetMetadata.filePath ||
      targetMetadata.filePath.length <= 1
    ) {
      return defaultUri;
    }

    const wrapperPath = XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath);
    const wrapResult = XmlSchemaWrapperGeneratorService.computeValidationUri(
      {
        filePaths: targetMetadata.filePath,
        definitionFiles,
        rootElement: targetMetadata.rootElementChoice,
      },
      wrapperPath,
    );

    if (wrapResult.kind === 'wrapper') {
      try {
        await api.saveResourceContent(wrapResult.uri, wrapResult.xsd);
        return wrapResult.uri;
      } catch (err) {
        console.log('[DataMapperValidationStepService] Failed to save wrapper file, using default:', err);
      }
      return defaultUri;
    }

    return wrapResult.uri;
  }
}
