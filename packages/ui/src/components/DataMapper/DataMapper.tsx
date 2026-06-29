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
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperDndProvider } from '../../providers/datamapper-dnd.provider';
import { SourceTargetDnDHandler } from '../../providers/dnd/SourceTargetDnDHandler';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { EMPTY_XSL } from '../../services/mapping/mapping-serializer.service';

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
  const dndHandler = useMemo(() => new SourceTargetDnDHandler(), []);

  useEffect(() => {
    if (!metadataId) return;
    const initialize = async () => {
      let meta = await ctx.getMetadata<IDataMapperMetadata>(metadataId);
      if (meta) {
        // Check if XSLT file exists, create if missing
        const xsltExists = await ctx.isResourceExist(meta.xsltPath);

        if (!xsltExists) {
          await ctx.saveResourceContent(meta.xsltPath, EMPTY_XSL);
        }
      } else {
        const xsltPath = DataMapperStepService.initializeXsltStep(vizNode, metadataId, entitiesContext);
        meta = await DataMapperMetadataService.initializeDataMapperMetadata(ctx, metadataId, xsltPath);
      }
      setMetadata(meta);
      const initModel = await DataMapperMetadataService.loadDocuments(ctx, meta);
      setDocumentInitializationModel(initModel);
      const mappingFile = await DataMapperMetadataService.loadMappingFile(ctx, meta);
      setInitialXsltFile(mappingFile);
    };
    void initialize().then(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUpdateDocument = useCallback(
    async (definition: DocumentDefinition) => {
      if (!metadataId || !metadata) return;
      switch (definition.documentType) {
        case DocumentType.SOURCE_BODY:
          await DataMapperMetadataService.updateSourceBodyMetadata(ctx, metadataId, metadata, definition);
          if (vizNode) {
            DataMapperStepService.setUseJsonBody(
              vizNode,
              definition.definitionType === DocumentDefinitionType.JSON_SCHEMA,
              entitiesContext,
            );
          }
          break;
        case DocumentType.TARGET_BODY:
          await DataMapperMetadataService.updateTargetBodyMetadata(ctx, metadataId, metadata, definition);
          break;
        case DocumentType.PARAM:
          await DataMapperMetadataService.updateSourceParameterMetadata(
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
    async (name: string) => {
      if (!metadataId || !metadata) return;
      await DataMapperMetadataService.deleteSourceParameterMetadata(ctx, metadataId, metadata, name);
    },
    [ctx, metadata, metadataId],
  );

  const onRenameParameter = useCallback(
    async (oldName: string, newName: string) => {
      if (!metadataId || !metadata) return;
      await DataMapperMetadataService.renameSourceParameterMetadata(ctx, metadataId, metadata, oldName, newName);
    },
    [ctx, metadata, metadataId],
  );

  const onUpdateMappings = useCallback(
    async (xsltFile: string) => {
      if (!metadata) return;
      await DataMapperMetadataService.updateMappingFile(ctx, metadata, xsltFile);
    },
    [ctx, metadata],
  );

  const onUpdateNamespaceMap = useCallback(
    async (namespaceMap: Record<string, string>) => {
      if (!metadataId || !metadata) return;
      await DataMapperMetadataService.setNamespaceMap(ctx, metadataId, metadata, namespaceMap);
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
      <DataMapperDndProvider handler={dndHandler}>
        <MappingLinksProvider>
          <DataMapperControl />
        </MappingLinksProvider>
      </DataMapperDndProvider>
    </DataMapperProvider>
  );
};

export default DataMapper;
