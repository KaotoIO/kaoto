import { BeanFactory, BeansDeserializer } from '@kaoto/camel-catalog/types';
import { Content } from '@patternfly/react-core';
import { FunctionComponent, Suspense, use, useCallback, useContext, useMemo, useState } from 'react';

import { Loading } from '../../components/Loading';
import { MetadataEditor } from '../../components/MetadataEditor';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';
import { BeansEntityHandler } from '../../models/visualization/metadata/beans-entity-handler';
import { EntitiesContext, EntitiesContextResult } from '../../providers/entities.provider';

export const BeansPage: FunctionComponent = () => {
  const incomingContext = useContext(EntitiesContext);
  const [entitiesContext, setEntitiesContext] = useState(incomingContext);
  if (!incomingContext?.isLoading && incomingContext !== entitiesContext) {
    setEntitiesContext(incomingContext);
  }
  const camelResource = entitiesContext?.camelResource;
  const beansHandler = useMemo(() => new BeansEntityHandler(camelResource), [camelResource]);

  if (!beansHandler.isSupported()) {
    return <Content>Not applicable</Content>;
  }

  return (
    <BeansPageLoader
      beansHandler={beansHandler}
      entitiesContext={entitiesContext!}
      disabled={incomingContext?.isLoading}
    />
  );
};

interface BeansPageProps {
  beansHandler: BeansEntityHandler;
  entitiesContext: EntitiesContextResult;
  disabled?: boolean;
}

const BeansPageLoader: FunctionComponent<BeansPageProps> = (props) => {
  // The schema belongs to the catalog, not the document snapshot. Catalog changes
  // remount this page through CatalogLoaderProvider; source edits keep it loaded.
  const [beansSchemaPromise] = useState(() => props.beansHandler.getBeansSchema());

  return (
    <Suspense fallback={<Loading />}>
      <BeansPageInner {...props} beansSchemaPromise={beansSchemaPromise} />
    </Suspense>
  );
};

const BeansPageInner: FunctionComponent<
  BeansPageProps & { beansSchemaPromise: Promise<KaotoSchemaDefinition['schema'] | undefined> }
> = ({ beansHandler, entitiesContext, beansSchemaPromise, disabled }) => {
  const beansSchema = use(beansSchemaPromise);

  const getBeansModel = useCallback(() => {
    return beansHandler.getBeansModel() || [];
  }, [beansHandler]);

  const handleChangeModel = useCallback(
    (model: BeansDeserializer | BeanFactory[]) => {
      if (disabled) return;
      beansHandler.setBeansModel(model);
      entitiesContext.updateSourceCodeFromEntities();
    },
    [beansHandler, entitiesContext, disabled],
  );

  return (
    <MetadataEditor
      name="Beans"
      schema={beansSchema}
      metadata={getBeansModel()}
      onChangeModel={handleChangeModel}
      disabled={disabled}
    />
  );
};
