import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoForm, KaotoFormProps } from '@kaoto/forms';
import { Content } from '@patternfly/react-core';
import { FunctionComponent, Suspense, use, useCallback, useContext, useMemo } from 'react';

import { Loading } from '../../components/Loading';
import { CamelKResource, CamelKResourceKinds } from '../../models/camel/camel-k-resource';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';
import { EntitiesContext, EntitiesContextResult } from '../../providers/entities.provider';
import { MetadataService } from './metadata.service';

export const MetadataPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const camelkResource = entitiesContext?.camelResource as CamelKResource;

  const isSupported = useMemo(() => {
    return camelkResource && camelkResource.getType() in CamelKResourceKinds;
  }, [camelkResource]);

  const metadataSchemaPromise = useMemo(() => {
    if (!isSupported) {
      return Promise.resolve(undefined);
    }

    return MetadataService.getMetadataSchema();
  }, [isSupported]);

  if (!isSupported) {
    return <Content>Not applicable</Content>;
  }

  return (
    <Suspense fallback={<Loading />}>
      <MetadataPageInner
        camelkResource={camelkResource}
        entitiesContext={entitiesContext!}
        metadataSchemaPromise={metadataSchemaPromise}
      />
    </Suspense>
  );
};

const MetadataPageInner: FunctionComponent<{
  camelkResource: CamelKResource;
  entitiesContext: EntitiesContextResult;
  metadataSchemaPromise: Promise<KaotoSchemaDefinition['schema'] | undefined>;
}> = ({ camelkResource, entitiesContext, metadataSchemaPromise }) => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(
    () => ({ selectedTab: 'All', setSelectedTab: () => {} }),
    [],
  );
  const metadataSchema = use(metadataSchemaPromise);

  const getMetadataModel = useCallback(() => {
    const found = camelkResource.getMetadataEntity();
    return found?.parent.metadata ?? {};
  }, [camelkResource]);

  const onChangeModel = useCallback(
    (model: Record<string, unknown>) => {
      if (Object.keys(model).length > 0) {
        let entity = camelkResource.getMetadataEntity();
        if (!entity) {
          entity = camelkResource.createMetadataEntity();
        } else {
          entity.parent.metadata = model;
          camelkResource.refreshVisualMetadata();
        }
      } else {
        camelkResource.deleteMetadataEntity();
      }
      entitiesContext.updateEntitiesFromCamelResource();
    },
    [camelkResource, entitiesContext],
  );

  return (
    <CanvasFormTabsContext.Provider value={formTabsValue}>
      <KaotoForm
        data-testid="metadata-form"
        schema={metadataSchema}
        model={getMetadataModel()}
        onChange={onChangeModel as KaotoFormProps['onChange']}
      />
    </CanvasFormTabsContext.Provider>
  );
};
