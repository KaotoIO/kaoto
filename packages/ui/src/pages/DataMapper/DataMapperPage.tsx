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
import { DataMapper } from '../../components/DataMapper/DataMapper';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { DocumentDefinition, DocumentInitializationModel } from '../../models/datamapper/document';
import { IVisualizationNode } from '../../models';
import { EntitiesContext, MetadataContext } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DocumentType } from '../../models/datamapper/path';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { Loading } from '../../components/Loading';

export interface IDataMapperProps {
  vizNode?: IVisualizationNode;
}

export const DataMapperPage: FunctionComponent<IDataMapperProps> = ({ vizNode }) => {
  const entitiesContext = useContext(EntitiesContext)!;
  const ctx = useContext(MetadataContext)!;
  const metadataId = vizNode && DataMapperMetadataService.getDataMapperMetadataId(vizNode);
  const [metadata, setMetadata] = useState<IDataMapperMetadata>();
  const [documentInitializationModel, setDocumentInitializationModel] = useState<DocumentInitializationModel>();
  const [initialXsltFile, setInitialXsltFile] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!metadataId) return;
    const initialize = async () => {
      let meta = await ctx.getMetadata<IDataMapperMetadata>(metadataId);
      if (!meta) {
        meta = await DataMapperMetadataService.initializeDataMapperMetadata(entitiesContext, vizNode, ctx, metadataId);
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
          break;
        case DocumentType.TARGET_BODY:
          DataMapperMetadataService.updateTargetBodyMetadata(ctx, metadataId, metadata, definition);
          break;
        case DocumentType.PARAM:
          DataMapperMetadataService.updateSourceParameterMetadata(
            ctx,
            metadataId,
            metadata,
            definition.name!,
            definition,
          );
      }
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

  return !metadataId ? (
    <>No associated DataMapper step was provided.</>
  ) : isLoading ? (
    <Loading />
  ) : (
    <DataMapperProvider
      documentInitializationModel={documentInitializationModel}
      onUpdateDocument={onUpdateDocument}
      initialXsltFile={initialXsltFile}
      onUpdateMappings={onUpdateMappings}
    >
      <DataMapperCanvasProvider>
        <DataMapper />
      </DataMapperCanvasProvider>
    </DataMapperProvider>
  );
};

export default DataMapperPage;
