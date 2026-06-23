import { createContext, FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    const init = async () => {
      await kaotoResource.initialize();
      setEntities(kaotoResource.getEntities());
      setVisualEntities(kaotoResource.getVisualEntities());
    };
    void init();
  }, [kaotoResource]);

  const updateSourceCodeFromEntities = useCallback(() => {
    const code = kaotoResource.toString();
    eventNotifier.next('entities:updated', code);
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
      currentSchemaType: kaotoResource?.getType(),
      camelResource: kaotoResource,
      updateEntitiesFromCamelResource,
      updateSourceCodeFromEntities,
    }),
    [entities, visualEntities, kaotoResource, updateEntitiesFromCamelResource, updateSourceCodeFromEntities],
  );

  return <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>;
};
