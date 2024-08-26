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
import { StandaloneLayout } from './layout';
import { FunctionComponent } from 'react';

import { DataMapperProvider } from './providers';
import { CanvasProvider } from './providers/CanvasProvider';
import { MainCanvas } from './layout/MainCanvas';

export interface IDataMapperProps {
  modalsContainerId?: string;
  xsltFile?: string;
  onUpdate?: (xsltFile: string) => void;
  isEmbedded?: boolean;
}

export const DataMapper: FunctionComponent<IDataMapperProps> = ({ xsltFile, onUpdate, isEmbedded }) => {
  return (
    <>
      <DataMapperProvider xsltFile={xsltFile} onUpdate={onUpdate}>
        <CanvasProvider>{isEmbedded ? <MainCanvas /> : <StandaloneLayout />}</CanvasProvider>
      </DataMapperProvider>
    </>
  );
};
