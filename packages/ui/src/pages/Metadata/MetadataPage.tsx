import { ObjectMeta } from '@kaoto/camel-catalog/types';
import { Content } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { KaotoForm, KaotoFormProps } from '../../components/Visualization/Canvas/FormV2/KaotoForm';
import { CamelKResource, CamelKResourceKinds } from '../../models/camel/camel-k-resource';
import { CanvasFormTabsContext, CanvasFormTabsContextResult } from '../../providers/canvas-form-tabs.provider';
import { EntitiesContext } from '../../providers/entities.provider';
import { useSchemasStore } from '../../store';

export const MetadataPage: FunctionComponent = () => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(() => ({ selectedTab: 'All', onTabChange: () => {} }), []);
  const schemaMap = useSchemasStore((state) => state.schemas);
  const entitiesContext = useContext(EntitiesContext);
  const camelkResource = entitiesContext?.camelResource as CamelKResource;

  const metadataSchema = useMemo(() => {
    return schemaMap['ObjectMeta'].schema;
  }, [schemaMap]);

  const isSupported = useMemo(() => {
    return camelkResource && camelkResource.getType() in CamelKResourceKinds;
  }, [camelkResource]);

  const getMetadataModel = useCallback(() => {
    const found = camelkResource.getMetadataEntity();
    return found?.parent.metadata ?? {};
  }, [camelkResource]);

  const onChangeModel = useCallback(
    (model: ObjectMeta) => {
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
      entitiesContext?.updateEntitiesFromCamelResource();
    },
    [camelkResource, entitiesContext],
  );

  return isSupported ? (
    <CanvasFormTabsContext.Provider value={formTabsValue}>
      <KaotoForm
        data-testid="metadata-form"
        schema={metadataSchema}
        model={getMetadataModel()}
        onChange={onChangeModel as KaotoFormProps['onChange']}
      />
    </CanvasFormTabsContext.Provider>
  ) : (
    <Content>Not applicable</Content>
  );
};
