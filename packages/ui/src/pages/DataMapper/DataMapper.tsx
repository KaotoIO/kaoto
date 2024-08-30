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
import { FunctionComponent } from 'react';
import { StandaloneLayout } from '../../components/DataMapper/layout';

import { MainCanvas } from '../../components/DataMapper/layout/MainCanvas';
import { DataMapperProvider } from '../../components/DataMapper/providers';
import { CanvasProvider } from '../../components/DataMapper/providers/CanvasProvider';
import { DocumentDefinition, DocumentInitializationModel } from '../../components/DataMapper/models/document';

export interface IDataMapperProps {
  modalsContainerId?: string;
  documentInitializationModel?: DocumentInitializationModel;
  onUpdateDocument?: (definition: DocumentDefinition) => void;
  initialXsltFile?: string;
  onUpdateMappings?: (xsltFile: string) => void;
  isEmbedded?: boolean;
}

export const DataMapper: FunctionComponent<IDataMapperProps> = ({
  documentInitializationModel,
  onUpdateDocument,
  initialXsltFile,
  onUpdateMappings,
  isEmbedded,
}) => {
  return (
    <>
      <DataMapperProvider
        documentInitializationModel={documentInitializationModel}
        onUpdateDocument={onUpdateDocument}
        initialXsltFile={initialXsltFile}
        onUpdateMappings={onUpdateMappings}
      >
        <CanvasProvider>{isEmbedded ? <MainCanvas /> : <StandaloneLayout />}</CanvasProvider>
      </DataMapperProvider>
    </>
  );
};

export default DataMapper;
