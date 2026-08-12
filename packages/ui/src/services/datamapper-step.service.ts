import { ProcessorDefinition, SetBody } from '@kaoto/camel-catalog/types';

import { getCamelRandomId } from '../camel-utils/camel-random-id';
import { DynamicCatalogRegistry } from '../dynamic-catalog/dynamic-catalog-registry';
import { IVisualizationNode } from '../models';
import { CatalogKind } from '../models/catalog-kind';
import { DocumentDefinition, DocumentDefinitionType } from '../models/datamapper/document';
import { EntitiesContextResult } from '../providers';
import { isXSLTComponent, XSLT_COMPONENT_NAME } from '../utils';
import type { XsltComponentDef } from '../utils/is-xslt-component';

/**
 * Service for managing DataMapper step construction.
 *
 * A DataMapper is a Camel step EIP that contains an xslt-saxon transformation step inside it.
 *
 * Example YAML structure:
 * ```yaml
 * - step:
 *     id: kaoto-datamapper-xxxxxxxx
 *     steps:
 *       - to:
 *           id: kaoto-datamapper-xslt-nnnn
 *           uri: xslt-saxon:kaoto-datamapper-xxxxxxxx.xsl
 *           parameters:
 *             useJsonBody: true
 * ```
 *
 * This service handles:
 * - vizNode interactions for the DataMapper step
 * - XSLT component configuration (document name, parameters)
 * - Capability detection (e.g., JSON body support)
 */
export class DataMapperStepService {
  /**
   * Gets the metadata ID from a DataMapper visualization node.
   * @param vizNode The visualization node
   * @returns The metadata ID
   */
  static getDataMapperMetadataId(vizNode: IVisualizationNode): string {
    const model = vizNode.getNodeDefinition();
    return model.id;
  }

  /**
   * Initializes the XSLT step with the document name based on metadata ID.
   * The XSLT step is guaranteed to exist from component default initialization.
   * @param vizNode The visualization node
   * @param metadataId The metadata identifier
   * @param entitiesContext The entities context for updating source code
   * @returns The document name
   */
  static initializeXsltStep(
    vizNode: IVisualizationNode,
    metadataId: string,
    entitiesContext: EntitiesContextResult,
  ): string {
    const model = vizNode.getNodeDefinition();
    const xsltStep = (model.steps as ProcessorDefinition[]).find(isXSLTComponent)!;
    const documentName = `${metadataId}.xsl`;

    xsltStep.to.uri = `${XSLT_COMPONENT_NAME}:${documentName}`;
    vizNode.updateModel(model);
    entitiesContext.updateSourceCodeFromEntities();

    return documentName;
  }

  /**
   * Extracts the XSLT file name from an XSLT step.
   * @param xsltStep The XSLT component definition
   * @returns The file name, or undefined if not found
   */
  static getXsltFileName(xsltStep?: XsltComponentDef): string | undefined {
    if (!xsltStep?.to?.uri) return undefined;
    const uriString = xsltStep.to.uri ?? '';
    return uriString.replace(`${XSLT_COMPONENT_NAME}:`, '');
  }

  /**
   * Checks if the xslt-saxon component supports JSON body via useJsonBody parameter.
   * This is determined by checking if the useJsonBody parameter exists in the component catalog.
   * @returns True if the xslt-saxon component supports JSON body, false otherwise
   */
  static async supportsJsonBody(): Promise<boolean> {
    const component = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Component, 'xslt-saxon');
    return component?.properties?.['useJsonBody'] !== undefined;
  }

  /**
   * Sets or removes the useJsonBody parameter on the XSLT step based on metadata.
   * If the source body is a JSON schema and JSON body is supported, sets useJsonBody=true.
   * Otherwise, removes the useJsonBody parameter.
   * @param vizNode The visualization node
   * @param isUseJsonBody The DataMapper metadata
   * @param entitiesContext The entities context for updating source code
   */
  static setUseJsonBody(
    vizNode: IVisualizationNode,
    isUseJsonBody: boolean,
    entitiesContext: EntitiesContextResult,
  ): void {
    const model = vizNode.getNodeDefinition();
    const xsltStep = (model.steps as ProcessorDefinition[])?.find(isXSLTComponent);

    if (!xsltStep?.to || typeof xsltStep.to !== 'object') {
      return;
    }

    xsltStep.to.parameters ??= {};

    const currentUseJsonBody = xsltStep.to.parameters?.useJsonBody;
    if (isUseJsonBody && currentUseJsonBody === true) {
      return;
    }

    if (!isUseJsonBody && currentUseJsonBody === undefined) {
      return;
    }

    if (isUseJsonBody) {
      xsltStep.to.parameters.useJsonBody = true;
    } else {
      delete xsltStep.to.parameters.useJsonBody;
    }

    vizNode.updateModel(model);
    entitiesContext.updateSourceCodeFromEntities();
  }

  static updateXsltFileName(
    vizNode: IVisualizationNode,
    newFileName: string,
    entitiesContext: EntitiesContextResult,
  ): void {
    const model = vizNode.getNodeDefinition();
    const xsltStep = (model.steps as ProcessorDefinition[]).find(isXSLTComponent);

    if (!xsltStep?.to || typeof xsltStep.to !== 'object') {
      return;
    }

    xsltStep.to.uri = `${XSLT_COMPONENT_NAME}:${newFileName}`;
    vizNode.updateModel(model);
    entitiesContext.updateSourceCodeFromEntities();
  }

  /**
   * Sets the source body-related XSLT configuration in one place.
   * It updates the useJsonBody parameter based on the source body definition
   * and synchronizes the managed setBody(null) step based on the definition type.
   * Body is considered used when sourceBodyDocument is defined and its type is not Primitive.
   * @param vizNode The visualization node
   * @param sourceBodyDocument The source body document definition
   * @param entitiesContext The entities context for updating source code
   */
  static setSourceBody(
    vizNode: IVisualizationNode,
    sourceBodyDocument: DocumentDefinition | undefined,
    entitiesContext: EntitiesContextResult,
  ): void {
    const isUseJsonBody = sourceBodyDocument?.definitionType === DocumentDefinitionType.JSON_SCHEMA;
    const isBodyUsed =
      sourceBodyDocument !== undefined && sourceBodyDocument.definitionType !== DocumentDefinitionType.Primitive;
    DataMapperStepService.setUseJsonBody(vizNode, isUseJsonBody, entitiesContext);
    DataMapperStepService.syncSetBodyNullStep(vizNode, isBodyUsed, entitiesContext);
  }

  private static isManagedSetBodyStep(step: ProcessorDefinition): boolean {
    if (!step.setBody || typeof step.setBody !== 'object') return false;

    const setBody = step.setBody as Record<string, unknown>;

    if (typeof setBody.id !== 'string' || !setBody.id.startsWith('kaoto-datamapper-set-body')) return false;

    // Detect verbose form: { expression: { simple: { expression: '${null}' } } }
    const verboseExpression = (setBody.expression as Record<string, unknown> | undefined)?.simple;
    if (verboseExpression && typeof verboseExpression === 'object') {
      return (verboseExpression as Record<string, unknown>).expression === '${null}';
    }

    // Detect short form: { simple: { expression: '${null}' } }
    const shortSimple = setBody.simple;
    if (shortSimple && typeof shortSimple === 'object') {
      return (shortSimple as Record<string, unknown>).expression === '${null}';
    }

    return false;
  }

  /**
   * Synchronizes the managed setBody step before the XSLT step based on whether the source body is used.
   * - If the source body is NOT used, ensures a managed setBody step exists as the first step.
   * - If the source body IS used, removes any managed setBody step.
   * @param vizNode The visualization node
   * @param isBodyUsed Whether the source body is referenced by any mapping
   * @param entitiesContext The entities context for updating source code
   */
  static syncSetBodyNullStep(
    vizNode: IVisualizationNode,
    isBodyUsed: boolean,
    entitiesContext: EntitiesContextResult,
  ): void {
    const model = vizNode.getNodeDefinition();
    const steps = model.steps as ProcessorDefinition[];
    if (!steps) return;

    const managedIndex = steps.findIndex((s) => DataMapperStepService.isManagedSetBodyStep(s));

    if (!isBodyUsed && managedIndex === -1) {
      steps.unshift({
        setBody: {
          id: getCamelRandomId('kaoto-datamapper-set-body'),
          expression: { simple: { expression: '${null}' } },
        } as SetBody,
      });
      vizNode.updateModel(model);
      entitiesContext.updateSourceCodeFromEntities();
    } else if (isBodyUsed && managedIndex !== -1) {
      steps.splice(managedIndex, 1);
      vizNode.updateModel(model);
      entitiesContext.updateSourceCodeFromEntities();
    }
  }
}
