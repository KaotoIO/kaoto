import { Step } from '@kaoto/camel-catalog/types';
import { IVisualizationNode } from '../../models';
import { IClipboardCopyObject } from '../../models/visualization/clipboard';
import { IMetadataApi } from '../../providers';
import { isDataMapperNode } from '../../utils/is-datamapper';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { clearXsltUri, setXsltUri } from './datamapper-utils';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';

type DataMapperNodeCollection = { idMap: Map<string, string>; updatedNodes: Map<string, Step> };

const collectDataMapperNodesFromChildren = (
  dmNodes: DataMapperNodeCollection,
  originalNode: object,
  updatedNode: object,
) => {
  for (const key of Object.keys(originalNode)) {
    const origValue = (originalNode as Record<string, unknown>)[key];
    const updatedValue = (updatedNode as Record<string, unknown>)[key];
    if (Array.isArray(origValue) && Array.isArray(updatedValue)) {
      for (const [i, item] of origValue.entries()) {
        if (updatedValue[i]) {
          collectDataMapperNodesRecursively(dmNodes, item as object, updatedValue[i] as object);
        }
      }
    } else if (typeof origValue === 'object' && origValue !== null) {
      collectDataMapperNodesRecursively(dmNodes, origValue, updatedValue as object);
    }
  }
};

const collectDataMapperNodesRecursively = (
  dmNodes: DataMapperNodeCollection,
  originalNode: object,
  updatedNode: object,
): void => {
  if (!originalNode || !updatedNode || typeof originalNode !== 'object' || typeof updatedNode !== 'object') {
    return;
  }

  if (isDataMapperNode(originalNode)) {
    const originalId = (originalNode as Step).id;
    const updatedId = (updatedNode as Step).id;
    if (originalId && updatedId) {
      dmNodes.idMap.set(originalId, updatedId);
      dmNodes.updatedNodes.set(updatedId, updatedNode as Step);
    }
  }

  collectDataMapperNodesFromChildren(dmNodes, originalNode, updatedNode);
};

const collectDataMapperNodes = (originalNode: object, updatedNode: object): DataMapperNodeCollection => {
  const idMap = new Map<string, string>();
  const updatedNodes = new Map<string, Step>();

  collectDataMapperNodesRecursively({ idMap, updatedNodes }, originalNode, updatedNode);
  return { idMap, updatedNodes };
};

const generateDataMapperMetadata = async (
  api: IMetadataApi | undefined,
  updatedNodes: Map<string, Step>,
  originalId: string,
  newId: string,
) => {
  if (!api) {
    const updatedNode = updatedNodes.get(newId);
    if (updatedNode) {
      clearXsltUri(updatedNode);
    }
    return;
  }

  const originalMetadata = await api.getMetadata<IDataMapperMetadata>(originalId);

  if (!originalMetadata) {
    const newMetadata = DataMapperMetadataService.createMetadata();

    await api.setMetadata(newId, newMetadata);

    const updatedNode = updatedNodes.get(newId);
    if (updatedNode) {
      clearXsltUri(updatedNode);
    }
    return;
  }

  const newXsltPath = `${newId}.xsl`;
  const newMetadata = DataMapperMetadataService.cloneMetadata(originalMetadata, newXsltPath);

  await api.setMetadata(newId, newMetadata);

  await DataMapperMetadataService.duplicateXsltFile(api, originalMetadata, newXsltPath);

  const updatedNode = updatedNodes.get(newId);
  if (updatedNode) {
    setXsltUri(updatedNode, newXsltPath);
  }
};

export const onPasteDataMapper = async (
  api: IMetadataApi | undefined,
  parameters: {
    targetVizNode: IVisualizationNode;
    originalContent: IClipboardCopyObject | undefined;
    updatedContent: IClipboardCopyObject | undefined;
  },
): Promise<void> => {
  if (!parameters.originalContent || !parameters.updatedContent) return;

  const { idMap, updatedNodes } = collectDataMapperNodes(
    parameters.originalContent.definition,
    parameters.updatedContent.definition,
  );

  for (const [originalId, newId] of idMap.entries()) {
    await generateDataMapperMetadata(api, updatedNodes, originalId, newId);
  }
};
