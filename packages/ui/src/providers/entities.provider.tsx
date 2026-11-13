import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { Loading } from '../components/Loading';
import { useKaotoResourceContext } from '../hooks/useKaotoResourceContext/useKaotoResourceContext';
import { BaseVisualEntity } from '../models';
import { SourceSchemaType } from '../models/camel';
import { BaseEntity } from '../models/entities';
import { KaotoResource } from '../models/kaoto-resource';
import { EventNotifier } from '../utils';

export interface EntitiesContextResult {
  entities: BaseEntity[];
  currentSchemaType: SourceSchemaType;
  visualEntities: BaseVisualEntity[];
  camelResource: KaotoResource;

  /**
   * Notify that a property in an entity has changed, hence the source
   * code needs to be updated
   *
   * NOTE: This process shouldn't recreate the CamelResource neither
   * the entities, just the source code
   */
  updateSourceCodeFromEntities: () => void;

  /**
   * Refresh the entities from the Camel Resource, and
   * notify subscribers that a `entities:updated` happened
   *
   * NOTE: This process shouldn't recreate the CamelResource,
   * just the entities
   */
  updateEntitiesFromCamelResource: () => void;
}

export const EntitiesContext = createContext<EntitiesContextResult | null>(null);

export const EntitiesProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const eventNotifier = EventNotifier.getInstance();

  const { kaotoResource } = useKaotoResourceContext();
  const [entities, setEntities] = useState<BaseEntity[]>([]);
  const [visualEntities, setVisualEntities] = useState<BaseVisualEntity[]>([]);
  /**
   * The resource is initialized asynchronously. Until the first one is ready, the empty entity lists above would
   * render an empty canvas before the document shows up. Later resources keep the previous entities meanwhile.
   */
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await kaotoResource.initialize();
        if (cancelled) return;
        setEntities(kaotoResource.getEntities());
        setVisualEntities(kaotoResource.getVisualEntities());
        setInitialized(true);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to initialize KaotoResource', error);
        setEntities([]);
        setVisualEntities([]);
        setInitialized(true);
      }
    };
    void init();

    return () => {
      cancelled = true;
    };
  }, [kaotoResource]);

  const updateSourceCodeFromEntities = useCallback(() => {
    void kaotoResource.toSourceCode().then((code) => {
      eventNotifier.next('entities:updated', code);
    });
  }, [kaotoResource, eventNotifier]);

  const updateEntitiesFromCamelResource = useCallback(() => {
    const entities = kaotoResource.getEntities();
    const visualEntities = kaotoResource.getVisualEntities();
    setEntities(entities);
    setVisualEntities(visualEntities);

    /**
     * Notify consumers that entities has been refreshed, hence the code needs to be updated
     */
    updateSourceCodeFromEntities();
  }, [kaotoResource, updateSourceCodeFromEntities]);

  const value = useMemo(
    () => ({
      entities,
      visualEntities,
      currentSchemaType: kaotoResource.getType(),
      camelResource: kaotoResource,
      updateEntitiesFromCamelResource,
      updateSourceCodeFromEntities,
    }),
    [entities, visualEntities, kaotoResource, updateEntitiesFromCamelResource, updateSourceCodeFromEntities],
  );

  if (!initialized) {
    return (
      <Loading>
        <Content data-testid="loading-entities" component={ContentVariants.h3}>
          Loading entities...
        </Content>
      </Loading>
    );
  }

  return <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>;
};
