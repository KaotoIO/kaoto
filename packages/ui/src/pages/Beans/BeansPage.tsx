import { BeanFactory, BeansDeserializer } from '@kaoto/camel-catalog/types';
import { Content } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';

import { MetadataEditor } from '../../components/MetadataEditor';
import { BeansEntityHandler } from '../../models/visualization/metadata/beans-entity-handler';
import { EntitiesContext } from '../../providers/entities.provider';

export const BeansPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const camelResource = entitiesContext?.camelResource;
  const beansHandler = useMemo(() => {
    return new BeansEntityHandler(camelResource);
  }, [camelResource]);
  const isSupported = useMemo(() => {
    return beansHandler.isSupported();
  }, [beansHandler]);
  const beansSchema = useMemo(() => {
    return beansHandler.getBeansSchema();
  }, [beansHandler]);
  const getBeansModel = useCallback(() => {
    return beansHandler.getBeansModel() || [];
  }, [beansHandler]);

  const handleChangeModel = useCallback(
    (model: BeansDeserializer | BeanFactory[]) => {
      beansHandler.setBeansModel(model);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [beansHandler, entitiesContext],
  );

  return isSupported ? (
    <MetadataEditor name="Beans" schema={beansSchema} metadata={getBeansModel()} onChangeModel={handleChangeModel} />
  ) : (
    <Content>Not applicable</Content>
  );
};
