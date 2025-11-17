import { useEffect } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { useMappingLinks } from '../../../hooks/useMappingLinks';
import { MappingLinksService } from '../../../services/mapping-links.service';

export const DataMapperMonitor = () => {
  const { mappingTree, sourceParameterMap, sourceBodyDocument, targetBodyDocument } = useDataMapper();
  const { getSelectedNodeReference } = useMappingLinks();

  useEffect(() => {
    MappingLinksService.extractMappingLinks(
      mappingTree,
      sourceParameterMap,
      sourceBodyDocument,
      getSelectedNodeReference(),
    ).forEach((mapping) => {
      console.log(`Mapping: [source={${mapping.sourceNodePath}}, target={${mapping.targetNodePath}}]`);
    });
  }, [getSelectedNodeReference, mappingTree, sourceBodyDocument, sourceParameterMap, targetBodyDocument]);

  return <></>;
};
