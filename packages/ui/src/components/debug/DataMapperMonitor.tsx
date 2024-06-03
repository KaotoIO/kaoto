import { useDataMapper } from '../../hooks/useDataMapper';
import { useEffect } from 'react';

export const DataMapperMonitor = () => {
  const { mappingTree } = useDataMapper();

  useEffect(() => {
    mappingTree.forEach((mapping) => {
      console.log(
        `Mapping: [source={${mapping.sourceFields.map((s) => s.fieldIdentifier + ', ')}}, target={${mapping.targetFields.map((t) => t.fieldIdentifier + ', ')}}]`,
      );
    });
  }, [mappingTree]);

  return <></>;
};
