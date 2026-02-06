/*
    Copyright (C) 2024 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { FunctionComponent, useCallback, useContext, useEffect, useState } from 'react';

import { DataMapperControl } from '../../components/DataMapper/DataMapperControl';
import { Loading } from '../../components/Loading';
import { IVisualizationNode } from '../../models';
import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
} from '../../models/datamapper/document';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { EntitiesContext, MetadataContext } from '../../providers';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';

export interface IDataMapperProps {
  vizNode?: IVisualizationNode;
}

export const DataMapper: FunctionComponent<IDataMapperProps> = ({ vizNode }) => {
  const entitiesContext = useContext(EntitiesContext)!;
  const ctx = useContext(MetadataContext)!;
  const metadataId = vizNode && DataMapperStepService.getDataMapperMetadataId(vizNode);
  const [metadata, setMetadata] = useState<IDataMapperMetadata>();
  const [documentInitializationModel, setDocumentInitializationModel] = useState<DocumentInitializationModel>();
  const [initialXsltFile, setInitialXsltFile] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!metadataId) return;
    const initialize = async () => {
      let meta = await ctx.getMetadata<IDataMapperMetadata>(metadataId);
      if (!meta) {
        const xsltPath = DataMapperStepService.initializeXsltStep(vizNode, metadataId, entitiesContext);
        meta = await DataMapperMetadataService.initializeDataMapperMetadata(ctx, metadataId, xsltPath);
      }
      setMetadata(meta);
      const initModel = await DataMapperMetadataService.loadDocuments(ctx, meta);
      setDocumentInitializationModel(initModel);
      const mappingFile = await DataMapperMetadataService.loadMappingFile(ctx, meta);
      setInitialXsltFile(mappingFile);
    };
    initialize().then(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUpdateDocument = useCallback(
    (definition: DocumentDefinition) => {
      if (!metadataId || !metadata) return;
      switch (definition.documentType) {
        case DocumentType.SOURCE_BODY:
          DataMapperMetadataService.updateSourceBodyMetadata(ctx, metadataId, metadata, definition);
          if (vizNode) {
            DataMapperStepService.setUseJsonBody(
              vizNode,
              definition.definitionType === DocumentDefinitionType.JSON_SCHEMA,
              entitiesContext,
            );
          }
          break;
        case DocumentType.TARGET_BODY:
          DataMapperMetadataService.updateTargetBodyMetadata(ctx, metadataId, metadata, definition);
          break;
        case DocumentType.PARAM:
          DataMapperMetadataService.updateSourceParameterMetadata(
            ctx,
            metadataId,
            metadata,
            definition.name,
            definition,
          );
      }
    },
    [ctx, metadata, metadataId, vizNode, entitiesContext],
  );

  const onDeleteParameter = useCallback(
    (name: string) => {
      if (!metadataId || !metadata) return;
      DataMapperMetadataService.deleteSourceParameterMetadata(ctx, metadataId, metadata, name);
    },
    [ctx, metadata, metadataId],
  );

  const onRenameParameter = useCallback(
    (oldName: string, newName: string) => {
      if (!metadataId || !metadata) return;
      DataMapperMetadataService.renameSourceParameterMetadata(ctx, metadataId, metadata, oldName, newName);
    },
    [ctx, metadata, metadataId],
  );

  const onUpdateMappings = useCallback(
    (xsltFile: string) => {
      if (!metadata) return;
      DataMapperMetadataService.updateMappingFile(ctx, metadata, xsltFile);
    },
    [ctx, metadata],
  );

  const onUpdateNamespaceMap = useCallback(
    (namespaceMap: Record<string, string>) => {
      if (!metadataId || !metadata) return;
      DataMapperMetadataService.setNamespaceMap(ctx, metadataId, metadata, namespaceMap);
    },
    [ctx, metadata, metadataId],
  );

  if (!metadataId) {
    return <>No associated DataMapper step was provided.</>;
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <DataMapperProvider
      documentInitializationModel={documentInitializationModel}
      onUpdateDocument={onUpdateDocument}
      onDeleteParameter={onDeleteParameter}
      onRenameParameter={onRenameParameter}
      initialXsltFile={initialXsltFile}
      onUpdateMappings={onUpdateMappings}
      onUpdateNamespaceMap={onUpdateNamespaceMap}
    >
      <DataMapperCanvasProvider>
        <DataMapperControl />
      </DataMapperCanvasProvider>
    </DataMapperProvider>
  );
};

export default DataMapper;
