import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { IVisualizationNode } from '../models';
import { CatalogKind } from '../models/catalog-kind';
import { DocumentDefinition, DocumentDefinitionType } from '../models/datamapper/document';
import { isExpressionHolder, MappingItem, MappingTree } from '../models/datamapper/mapping';
import { CamelCatalogService } from '../models/visualization/flows/camel-catalog.service';
import { EntitiesContextResult } from '../providers';
import { isXSLTComponent, XSLT_COMPONENT_NAME } from '../utils';
import type { XsltComponentDef } from '../utils/is-xslt-component';
import { XPathService } from './xpath/xpath.service';
import { getCamelRandomId } from '../camel-utils/camel-random-id';

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
  static supportsJsonBody(): boolean {
    const component = CamelCatalogService.getComponent(CatalogKind.Component, 'xslt-saxon');
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

    const currentUseJsonBody = xsltStep.to.parameters?.useJsonBody;
    if (isUseJsonBody && currentUseJsonBody === true) {
      return;
    }

    if (!isUseJsonBody && currentUseJsonBody === undefined) {
      return;
    }

    if (isUseJsonBody) {
      if (!xsltStep.to.parameters) {
        xsltStep.to.parameters = {};
      }
      xsltStep.to.parameters.useJsonBody = true;
    } else {
      delete xsltStep.to.parameters!.useJsonBody;
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
   * and synchronizes the managed setBody(null) step based on the current mapping usage.
   * @param vizNode The visualization node
   * @param sourceBodyDocument The source body document definition
   * @param isBodyUsed Whether the source body is referenced by any mapping
   * @param entitiesContext The entities context for updating source code
   */
  static setSourceBody(
    vizNode: IVisualizationNode,
    sourceBodyDocument: DocumentDefinition | undefined,
    isBodyUsed: boolean,
    entitiesContext: EntitiesContextResult,
  ): void {
    const isUseJsonBody = sourceBodyDocument?.definitionType === DocumentDefinitionType.JSON_SCHEMA;
    DataMapperStepService.setUseJsonBody(vizNode, isUseJsonBody, entitiesContext);
    DataMapperStepService.syncSetBodyNullStep(vizNode, isBodyUsed, entitiesContext);
  }

  /**
   * Checks whether any mapping in the given tree references the source body document.
   * Source body references are XPath expressions that have no document reference name
   * (i.e., they reference the context node, which is the body).
   * @param mappingTree The mapping tree to inspect
   * @returns True if at least one mapping expression uses the source body
   */
  static isSourceBodyUsed(mappingTree: MappingTree): boolean {
    return DataMapperStepService.checkTreeItemForBodyUsage(mappingTree);
  }

  private static checkTreeItemForBodyUsage(item: MappingTree | MappingItem): boolean {
    for (const child of item.children) {
      console.debug(`Checking mapping item for body usage: ${child.id} ${child.name} `);
      if (isExpressionHolder(child)) {
        try {
          const paths = XPathService.extractFieldPaths(child.expression, child.contextPath);
          if (paths.some((p) => !p.documentReferenceName)) {
            return true;
          }
        } catch {
          // Ignore XPath parse errors
        }
      }
      if (DataMapperStepService.checkTreeItemForBodyUsage(child)) {
        return true;
      }
    }
    return false;
  }

  private static isManagedSetBodyStep(step: ProcessorDefinition): boolean {
    if (!step.setBody || typeof step.setBody !== 'object') return false;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const simple = (step.setBody as any).simple;
    if (!simple || typeof simple !== 'object') return false;

    const expression = simple.expression;
    return expression === '${null}';
  }

  private static normalizeSetBodyStep(step: ProcessorDefinition): void {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (step.setBody as any).simple = { expression: '${null}' };
  }

  /**
   * Synchronizes the managed setBody step before the XSLT step based on whether the source body is used.
   * - If the source body is NOT used, ensures a managed setBody step exists as the first step.
   * - If the source body IS used, removes any managed setBody step.
   * Managed setBody is identified as an expression with a constant set to null or empty string.
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
    let changed = false;

    const setBodyIndexes = steps.reduce<number[]>((acc, step, index) => {
      if (step.setBody !== undefined) acc.push(index);
      return acc;
    }, []);

    const managedSetBodyIndexes = setBodyIndexes.filter((index) => DataMapperStepService.isManagedSetBodyStep(steps[index]));

    const managedSetBodyIndex = managedSetBodyIndexes[0];

    const setBodyIndex = setBodyIndexes[0];

    if (!isBodyUsed) {
      if (managedSetBodyIndex !== undefined) {
        if (managedSetBodyIndex !== 0) {
          const [setBodyStep] = steps.splice(managedSetBodyIndex, 1);
          steps.unshift(setBodyStep);
          changed = true;
        }
        DataMapperStepService.normalizeSetBodyStep(steps[0]);

        if (managedSetBodyIndexes.length > 1) {
          for (const index of managedSetBodyIndexes.slice(1).sort((a, b) => b - a)) {
            steps.splice(index, 1);
            changed = true;
          }
        }
      } else if (setBodyIndex !== undefined) {
        DataMapperStepService.normalizeSetBodyStep(steps[setBodyIndex]);
        changed = true;
      } else {
        steps.unshift({
          setBody: {
            id: getCamelRandomId('kaoto-datamapper-set-body'),
            simple: { expression: '${null}' },
          } as any,
        });
        changed = true;
      }
    } else if (managedSetBodyIndex !== undefined) {
      for (const index of managedSetBodyIndexes.sort((a, b) => b - a)) {
        steps.splice(index, 1);
        changed = true;
      }
    }

    if (changed) {
      vizNode.updateModel(model);
      entitiesContext.updateSourceCodeFromEntities();
    }
  }
}
