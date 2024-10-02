import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { IMetadataApi } from '../../providers';
import { IVisualizationNode } from '../../models';

export const onDeleteDataMapper = (api: IMetadataApi, vizNode: IVisualizationNode) => {
  const metadataId = DataMapperMetadataService.getDataMapperMetadataId(vizNode);
  DataMapperMetadataService.deleteMetadata(api, metadataId);
  // TODO DataMapperMetadataService.deleteXsltFile(api, metadataId);
};
