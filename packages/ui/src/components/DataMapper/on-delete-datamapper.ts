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
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { IMetadataApi } from '../../providers';
import { IVisualizationNode } from '../../models';

export const ACTION_ID_DELETE_STEP_AND_FILE = 'del-step-and-file';
export const ACTION_ID_DELETE_STEP_ONLY = 'del-step-only';

export const onDeleteDataMapper = async (
  api: IMetadataApi,
  vizNode: IVisualizationNode,
  modalAnswer: string | undefined,
) => {
  const metadataId = DataMapperMetadataService.getDataMapperMetadataId(vizNode);
  if (modalAnswer === ACTION_ID_DELETE_STEP_AND_FILE) {
    await DataMapperMetadataService.deleteXsltFile(api, metadataId);
  }
  await DataMapperMetadataService.deleteMetadata(api, metadataId);
};
