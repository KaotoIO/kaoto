import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { EntitiesContextResult } from '../hooks';
import { IVisualizationNode } from '../models';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
} from '../models/datamapper';
import { IDataMapperMetadata, IDocumentMetadata } from '../models/datamapper/metadata';
import { IMetadataApi } from '../providers';
import { isDefined, isXSLTComponent, XSLT_COMPONENT_NAME } from '../utils';
import type { XsltComponentDef } from '../utils/is-xslt-component';
import { EMPTY_XSL } from './mapping-serializer.service';

export class DataMapperMetadataService {
  static readonly SCHEMA_NAME_PATTERN = '**/*.{xsd,xml,XSD,XML}';

  static getDataMapperMetadataId(vizNode: IVisualizationNode) {
    const model = vizNode.getComponentSchema()?.definition;
    return `${vizNode.getId()}-${model.id}`; // routeId-stepId
  }

  static async initializeDataMapperMetadata(
    entitiesContext: EntitiesContextResult,
    vizNode: IVisualizationNode,
    api: IMetadataApi,
    metadataId: string,
  ): Promise<IDataMapperMetadata> {
    const model = vizNode.getComponentSchema()?.definition;
    const xsltStep = (model.steps as ProcessorDefinition[] | undefined)?.find(isXSLTComponent);
    let documentName = this.getXSLTDocumentName(xsltStep);

    if (isDefined(xsltStep) && !isDefined(documentName)) {
      /** At this point, the Kaoto Data Mapper is not yet configured, hence we create the XSLT mapping document name */
      documentName = `${metadataId}.xsl`;
      xsltStep.to.uri = `${XSLT_COMPONENT_NAME}:${documentName}`;
      vizNode.updateModel(model);
      entitiesContext.updateSourceCodeFromEntities();
    }

    const metadata = {
      sourceBody: {
        type: DocumentDefinitionType.Primitive,
      },
      sourceParameters: {},
      targetBody: {
        type: DocumentDefinitionType.Primitive,
      },
      xsltPath: documentName,
    } as IDataMapperMetadata;

    const metadataPromise = api.setMetadata(metadataId, metadata);
    const contentPromise = api.saveResourceContent(metadata.xsltPath, EMPTY_XSL);
    await Promise.allSettled([metadataPromise, contentPromise]);

    return metadata;
  }

  static loadDocuments(api: IMetadataApi, metadata: IDataMapperMetadata): Promise<DocumentInitializationModel> {
    return new Promise((resolve) => {
      const answer = new DocumentInitializationModel();
      const sourceBodyPromise = DataMapperMetadataService.doLoadDocument(
        api,
        DocumentType.SOURCE_BODY,
        BODY_DOCUMENT_ID,
        metadata.sourceBody,
      ).then((definition) => (answer.sourceBody = definition));
      const targetBodyPromise = DataMapperMetadataService.doLoadDocument(
        api,
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        metadata.targetBody,
      ).then((definition) => (answer.targetBody = definition));
      const paramPromises = Object.entries(metadata.sourceParameters).reduce(
        (acc, [key, meta]) => {
          acc[key] = DataMapperMetadataService.doLoadDocument(api, DocumentType.PARAM, key, meta).then(
            (definition) => (answer.sourceParameters[key] = definition),
          );
          return acc;
        },
        {} as Record<string, Promise<DocumentDefinition>>,
      );
      Promise.allSettled([sourceBodyPromise, targetBodyPromise, Object.values(paramPromises)]).then(() => {
        resolve(answer);
      });
    });
  }

  static getXSLTDocumentName(xsltStep?: XsltComponentDef): string | undefined {
    if (!xsltStep) {
      return undefined;
    }

    const [_componentUri, uriFileName] = xsltStep.to.uri.split(':');
    return uriFileName;
  }

  private static doLoadDocument(
    api: IMetadataApi,
    documentType: DocumentType,
    name: string,
    documentMetadata: IDocumentMetadata,
  ): Promise<DocumentDefinition> {
    return new Promise((resolve) => {
      const definitionType = documentMetadata.type ? documentMetadata.type : DocumentDefinitionType.Primitive;
      const definitionFiles: Record<string, string> = {};
      const fileReadingPromises = !documentMetadata.filePath
        ? []
        : documentMetadata.filePath.map((path) =>
            api
              .getResourceContent(path)
              .then((value) => {
                if (value) definitionFiles[path] = value;
              })
              .catch((reason) => console.log(`Could not read a file "${path}": ${reason}`)),
          );
      Promise.allSettled(fileReadingPromises).then(() => {
        const answer = new DocumentDefinition(documentType, definitionType, name, definitionFiles);
        resolve(answer);
      });
    });
  }

  static loadMappingFile(api: IMetadataApi, metadata: IDataMapperMetadata): Promise<string | undefined> {
    return api.getResourceContent(metadata.xsltPath);
  }

  static async updateSourceBodyMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    definition: DocumentDefinition,
  ) {
    metadata.sourceBody = await DataMapperMetadataService.doCreateDocumentMetadata(
      api,
      metadataId,
      metadata,
      definition,
    );
    api.setMetadata(metadataId, metadata);
  }

  private static doCreateDocumentMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    definition: DocumentDefinition,
  ): Promise<IDocumentMetadata> {
    const filePaths = definition.definitionFiles ? Object.keys(definition.definitionFiles) : [];
    const answer = {
      type: definition.definitionType,
      filePath: filePaths,
    };
    const metadataPromise = api.setMetadata(metadataId, metadata);
    const filePromises =
      api.shouldSaveSchema && definition.definitionFiles
        ? Object.entries(definition.definitionFiles).map(([path, content]) => {
            api
              .saveResourceContent(path, content)
              .catch((error) => console.log(`Could not save a file "${path}": ${error}`));
          })
        : [];
    return new Promise((resolve) => {
      Promise.allSettled([metadataPromise, ...filePromises]).then(() => resolve(answer));
    });
  }

  static async updateTargetBodyMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    definition: DocumentDefinition,
  ) {
    metadata.targetBody = await DataMapperMetadataService.doCreateDocumentMetadata(
      api,
      metadataId,
      metadata,
      definition,
    );
    api.setMetadata(metadataId, metadata);
  }

  static async updateSourceParameterMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    name: string,
    definition: DocumentDefinition,
  ) {
    metadata.sourceParameters[name] = await DataMapperMetadataService.doCreateDocumentMetadata(
      api,
      metadataId,
      metadata,
      definition,
    );
    api.setMetadata(metadataId, metadata);
  }

  static async deleteSourceParameterMetadata(
    api: IMetadataApi,
    metadataId: string,
    metadata: IDataMapperMetadata,
    name: string,
  ) {
    delete metadata.sourceParameters[name];
    api.setMetadata(metadataId, metadata);
  }

  static async updateMappingFile(api: IMetadataApi, metadata: IDataMapperMetadata, xsltFile: string) {
    await api.saveResourceContent(metadata.xsltPath, xsltFile);
  }

  static async selectDocumentSchema(api: IMetadataApi) {
    return await api.askUserForFileSelection(this.SCHEMA_NAME_PATTERN, undefined, {
      canPickMany: false, // TODO set to true once we support xs:include/xs:import, i.e. multiple files
      placeHolder:
        'Choose the schema file to attach. Type a text to narrow down the candidates. The file path is shown as a relative path from the active Camel file opening with Kaoto.',
      title: 'Attaching document schema file',
    });
  }

  static async deleteMetadata(api: IMetadataApi, metadataId: string) {
    await api.setMetadata(metadataId, undefined);
  }

  static async deleteXsltFile(api: IMetadataApi, metadataId: string) {
    const metadata = (await api.getMetadata(metadataId)) as IDataMapperMetadata;
    await api.deleteResource(metadata.xsltPath);
  }
}
