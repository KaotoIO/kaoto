import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoForm, KaotoFormProps } from '@kaoto/forms';
import { Content } from '@patternfly/react-core';
import { FocusEvent, FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CamelKResource, CamelKResourceKinds } from '../../models/camel/camel-k-resource';
import { CatalogKind } from '../../models/catalog-kind';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';
import { CamelCatalogService } from '../../models/visualization/flows/camel-catalog.service';
import { EntitiesContext } from '../../providers/entities.provider';

export const MetadataPage: FunctionComponent = () => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(
    () => ({ selectedTab: 'All', setSelectedTab: () => {} }),
    [],
  );
  const entitiesContext = useContext(EntitiesContext);
  const camelkResource = entitiesContext?.camelResource as CamelKResource;
  const metadataSchema = CamelCatalogService.getComponent(CatalogKind.Entity, 'ObjectMeta')?.propertiesSchema || {};
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

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
      setHasPendingChanges(true);
    },
    [camelkResource, entitiesContext],
  );

  const flushPendingChanges = useCallback(() => {
    if (hasPendingChanges) {
      entitiesContext?.updateEntitiesFromCamelResource();
      setHasPendingChanges(false);
    }
  }, [entitiesContext, hasPendingChanges]);

  const handleContainerBlur = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      const current = containerRef.current;
      const nextFocused = e.relatedTarget as Node | null;
      if (!current || !nextFocused || !current.contains(nextFocused)) {
        flushPendingChanges();
      }
    },
    [flushPendingChanges],
  );

  useEffect(() => {
    return () => {
      flushPendingChanges();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isSupported ? (
    <CanvasFormTabsContext.Provider value={formTabsValue}>
      <div ref={containerRef} onBlur={handleContainerBlur}>
        <KaotoForm
          data-testid="metadata-form"
          schema={metadataSchema as KaotoSchemaDefinition['schema']}
          model={getMetadataModel()}
          onChange={onChangeModel as KaotoFormProps['onChange']}
        />
      </div>
    </CanvasFormTabsContext.Provider>
  ) : (
    <Content>Not applicable</Content>
  );
};
