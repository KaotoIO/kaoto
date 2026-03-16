import { useEffect } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { MappingLinksService } from '../../../services/mapping-links.service';
import { useDocumentTreeStore } from '../../../store';

export const DataMapperMonitor = () => {
  const { mappingTree, sourceParameterMap, sourceBodyDocument, targetBodyDocument } = useDataMapper();
  const selectedNodePath = useDocumentTreeStore((state) => state.selectedNodePath);
  const selectedNodeIsSource = useDocumentTreeStore((state) => state.selectedNodeIsSource);

  useEffect(() => {
    MappingLinksService.extractMappingLinks(
      mappingTree,
      sourceParameterMap,
      sourceBodyDocument,
      selectedNodePath,
      selectedNodeIsSource,
    ).forEach((mapping) => {
      console.log(`Mapping: [source={${mapping.sourceNodePath}}, target={${mapping.targetNodePath}}]`);
    });
  }, [selectedNodePath, selectedNodeIsSource, mappingTree, sourceBodyDocument, sourceParameterMap, targetBodyDocument]);

  return <></>;
};
