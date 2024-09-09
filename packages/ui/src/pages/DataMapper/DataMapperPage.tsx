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
import { DataMapper } from '../../components/DataMapper/DataMapper';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { DocumentDefinition, DocumentInitializationModel } from '../../models/datamapper/document';

export interface IDataMapperProps {
  modalsContainerId?: string;
  documentInitializationModel?: DocumentInitializationModel;
  onUpdateDocument?: (definition: DocumentDefinition) => void;
  initialXsltFile?: string;
  onUpdateMappings?: (xsltFile: string) => void;
}

export const DataMapperPage: FunctionComponent<IDataMapperProps> = ({
  documentInitializationModel,
  onUpdateDocument,
  initialXsltFile,
  onUpdateMappings,
}) => {
  return (
    <>
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
    </>
  );
};

export default DataMapperPage;
