import { Step } from '@kaoto/camel-catalog/types';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { IMetadataApi } from '../../providers';
import { IVisualizationNode } from '../../models';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { IClipboardCopyObject } from '../../models/visualization/clipboard';
import { clearXsltUri, setXsltUri } from './datamapper-utils';

export const onDuplicateDataMapper = async (
  api: IMetadataApi | undefined,
  parameters: {
    sourceVizNode: IVisualizationNode;
    content: IClipboardCopyObject | undefined;
  },
): Promise<IClipboardCopyObject | undefined> => {
  if (!parameters.content) return parameters.content;

  const stepDef = parameters.content.definition as Step;
  const newStepId = stepDef?.id;

  if (!newStepId) return parameters.content;

  if (!api) {
    clearXsltUri(stepDef);
    return parameters.content;
  }

  const originalMetadataId = DataMapperMetadataService.getDataMapperMetadataId(parameters.sourceVizNode);

  const originalMetadata = await api.getMetadata<IDataMapperMetadata>(originalMetadataId);

  // If the associated DataMapper step metadata for the original step is not found, create an empty one.
  // Do not copy anything from unknown DataMapper step.
  if (!originalMetadata) {
    const newMetadata = DataMapperMetadataService.createMetadata();

    await api.setMetadata(newStepId, newMetadata);

    clearXsltUri(stepDef);

    return parameters.content;
  }

  const newXsltPath = `${newStepId}.xsl`;
  const newMetadata = DataMapperMetadataService.cloneMetadata(originalMetadata, newXsltPath);

  await api.setMetadata(newStepId, newMetadata);

  await DataMapperMetadataService.duplicateXsltFile(api, originalMetadata, newXsltPath);

  setXsltUri(stepDef, newXsltPath);

  return parameters.content;
};
