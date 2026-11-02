import { useEffect } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { MappingLinksService } from '../../../services/visualization/mapping-links.service';
import { useDocumentTreeStore } from '../../../store';

export const DataMapperMonitor = () => {
  const { mappingTree, sourceParameterMap, sourceBodyDocument, targetRenderIndex } = useDataMapper();
  const selectedNodePath = useDocumentTreeStore((state) => state.selectedNodePath);
  const selectedNodeIsSource = useDocumentTreeStore((state) => state.selectedNodeIsSource);

  useEffect(() => {
    const mappings = MappingLinksService.extractMappingLinks(
      mappingTree,
      sourceParameterMap,
      sourceBodyDocument,
      targetRenderIndex,
      selectedNodePath,
      selectedNodeIsSource,
    );
    for (const mapping of mappings) {
      console.debug(`Mapping: [source={${mapping.sourceNodePath}}, target={${mapping.targetNodePath}}]`);
    }
  }, [selectedNodePath, selectedNodeIsSource, mappingTree, sourceBodyDocument, sourceParameterMap, targetRenderIndex]);

  return null;
};
