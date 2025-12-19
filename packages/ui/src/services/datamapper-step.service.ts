import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { IVisualizationNode } from '../models';
import { CatalogKind } from '../models/catalog-kind';
import { CamelCatalogService } from '../models/visualization/flows/camel-catalog.service';
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

    if (!xsltStep.to.parameters) {
      xsltStep.to.parameters = {};
    }

    if (isUseJsonBody) {
      xsltStep.to.parameters.useJsonBody = true;
    } else {
      delete xsltStep.to.parameters.useJsonBody;
    }

    vizNode.updateModel(model);
    entitiesContext.updateSourceCodeFromEntities();
  }
}
