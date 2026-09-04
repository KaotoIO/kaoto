import { BeanFactory, BeansDeserializer } from '@kaoto/camel-catalog/types';
import { Content } from '@patternfly/react-core';
import { FunctionComponent, Suspense, use, useCallback, useContext, useMemo } from 'react';

import { Loading } from '../../components/Loading';
import { MetadataEditor } from '../../components/MetadataEditor';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';
import { BeansEntityHandler } from '../../models/visualization/metadata/beans-entity-handler';
import { EntitiesContext, EntitiesContextResult } from '../../providers/entities.provider';

export const BeansPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const camelResource = entitiesContext?.camelResource;
  const beansHandler = useMemo(() => new BeansEntityHandler(camelResource), [camelResource]);

  const isSupported = useMemo(() => beansHandler.isSupported(), [beansHandler]);
  const beansSchemaPromise = useMemo(() => {
    if (!beansHandler.isSupported()) {
      return Promise.resolve(undefined);
    }

    return beansHandler.getBeansSchema();
  }, [beansHandler]);

  if (!isSupported) {
    return <Content>Not applicable</Content>;
  }

  return (
    <Suspense fallback={<Loading />}>
      <BeansPageInner
        beansHandler={beansHandler}
        entitiesContext={entitiesContext!}
        beansSchemaPromise={beansSchemaPromise}
      />
    </Suspense>
  );
};

const BeansPageInner: FunctionComponent<{
  beansHandler: BeansEntityHandler;
  entitiesContext: EntitiesContextResult;
  beansSchemaPromise: Promise<KaotoSchemaDefinition['schema'] | undefined>;
}> = ({ beansHandler, entitiesContext, beansSchemaPromise }) => {
  const beansSchema = use(beansSchemaPromise);

  const getBeansModel = useCallback(() => {
    return beansHandler.getBeansModel() || [];
  }, [beansHandler]);

  const handleChangeModel = useCallback(
    (model: BeansDeserializer | BeanFactory[]) => {
      beansHandler.setBeansModel(model);
      entitiesContext.updateSourceCodeFromEntities();
    },
    [beansHandler, entitiesContext],
  );

  return (
    <MetadataEditor name="Beans" schema={beansSchema} metadata={getBeansModel()} onChangeModel={handleChangeModel} />
  );
};
