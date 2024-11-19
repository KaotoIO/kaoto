import { useDataMapper } from '../../../hooks/useDataMapper';
import { useEffect } from 'react';
import { MappingService } from '../../../services/mapping.service';

export const DataMapperMonitor = () => {
  const { mappingTree, sourceParameterMap, sourceBodyDocument, targetBodyDocument } = useDataMapper();

  useEffect(() => {
    MappingService.extractMappingLinks(mappingTree, sourceParameterMap, sourceBodyDocument).forEach((mapping) => {
      console.log(`Mapping: [source={${mapping.sourceNodePath}}, target={${mapping.targetNodePath}}]`);
    });
  }, [mappingTree, sourceBodyDocument, sourceParameterMap, targetBodyDocument]);

  return <></>;
};
