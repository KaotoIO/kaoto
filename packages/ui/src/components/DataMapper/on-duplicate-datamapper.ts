import { Step } from '@kaoto/camel-catalog/types';

import { IVisualizationNode } from '../../models';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { IClipboardContent } from '../../models/visualization/clipboard';
import { IMetadataApi } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';

export const onDuplicateDataMapper = async (
  api: IMetadataApi | undefined,
  parameters: {
    sourceVizNode: IVisualizationNode;
    content: IClipboardContent | undefined;
  },
): Promise<IClipboardContent | undefined> => {
  if (!parameters.content) return parameters.content;

  const stepDef = parameters.content.definition as Step;
  const newStepId = stepDef?.id;

  if (!newStepId) return parameters.content;

  if (!api) {
    DataMapperStepService.clearResources(stepDef);
    return parameters.content;
  }

  const originalMetadataId = DataMapperStepService.getDataMapperMetadataId(parameters.sourceVizNode);

  const originalMetadata = await api.getMetadata<IDataMapperMetadata>(originalMetadataId);

  // If the associated DataMapper step metadata for the original step is not found, create an empty one.
  // Do not copy anything from unknown DataMapper step.
  if (!originalMetadata) {
    const newMetadata = DataMapperMetadataService.createMetadata();

    await api.setMetadata(newStepId, newMetadata);

    DataMapperStepService.clearResources(stepDef);

    return parameters.content;
  }

  const newXsltPath = `${newStepId}.xsl`;
  const newMetadata = DataMapperMetadataService.cloneMetadata(originalMetadata, newXsltPath);

  await api.setMetadata(newStepId, newMetadata);

  const renames = await DataMapperMetadataService.duplicateMetadataFiles(api, originalMetadata, newXsltPath);
  DataMapperStepService.applyCopiedResources(stepDef, renames);

  return parameters.content;
};
