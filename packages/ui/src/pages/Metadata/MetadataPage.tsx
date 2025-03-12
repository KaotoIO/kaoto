import { Content } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { KaotoForm, KaotoFormProps } from '../../components/Visualization/Canvas/FormV2/KaotoForm';
import { CamelKResource, CamelKResourceKinds } from '../../models/camel/camel-k-resource';
import { CanvasFormTabsContext, CanvasFormTabsContextResult } from '../../providers/canvas-form-tabs.provider';
import { EntitiesContext } from '../../providers/entities.provider';
import { CamelCatalogService } from '../../models/visualization/flows/camel-catalog.service';
import { CatalogKind } from '../../models/catalog-kind';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';

export const MetadataPage: FunctionComponent = () => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(() => ({ selectedTab: 'All', onTabChange: () => {} }), []);
  const entitiesContext = useContext(EntitiesContext);
  const camelkResource = entitiesContext?.camelResource as CamelKResource;
  const metadataSchema = CamelCatalogService.getComponent(CatalogKind.Entity, 'ObjectMeta')?.propertiesSchema || {};

  const isSupported = useMemo(() => {
    return camelkResource && camelkResource.getType() in CamelKResourceKinds;
  }, [camelkResource]);

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
      entitiesContext?.updateEntitiesFromCamelResource();
    },
    [camelkResource, entitiesContext],
  );

  return isSupported ? (
    <CanvasFormTabsContext.Provider value={formTabsValue}>
      <KaotoForm
        data-testid="metadata-form"
        schema={metadataSchema as KaotoSchemaDefinition['schema']}
        model={getMetadataModel()}
        onChange={onChangeModel as KaotoFormProps['onChange']}
      />
    </CanvasFormTabsContext.Provider>
  ) : (
    <Content>Not applicable</Content>
  );
};
