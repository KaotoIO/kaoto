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
