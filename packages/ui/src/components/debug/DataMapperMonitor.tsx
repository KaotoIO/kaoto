import { useDataMapper } from '../../hooks/useDataMapper';
import { useEffect } from 'react';
import { MappingService } from '../../services/mapping.service';

export const DataMapperMonitor = () => {
  const { mappingTree } = useDataMapper();

  useEffect(() => {
    MappingService.extractMappingLinks(mappingTree).forEach((mapping) => {
      console.log(`Mapping: [source={${mapping.sourceNodePath}}, target={${mapping.targetNodePath}}]`);
    });
  }, [mappingTree]);

  return <></>;
};
