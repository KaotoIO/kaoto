import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import { BaseVisualEntity } from '../models';
import { SourceSchemaType } from '../models/camel';
import { CamelResourceFactory } from '../models/camel/camel-resource-factory';
import { BaseEntity } from '../models/entities';
import { KaotoResource } from '../models/kaoto-resource';
import { EventNotifier } from '../utils';
import { SourceCodeContext } from './source-code.provider';

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

interface EntitiesProviderProps extends PropsWithChildren {
  fileExtension?: string;
}

export const EntitiesProvider: FunctionComponent<EntitiesProviderProps> = ({ fileExtension, children }) => {
  const eventNotifier = EventNotifier.getInstance();
  const initialSourceCode = useContext(SourceCodeContext);

  let initialCamelResource: KaotoResource;
  try {
    initialCamelResource = CamelResourceFactory.createCamelResource(initialSourceCode, { path: fileExtension });
  } catch (error) {
    initialCamelResource = CamelResourceFactory.createCamelResource('', { path: fileExtension });
  }

  const [camelResource, setCamelResource] = useState<KaotoResource>(initialCamelResource);
  const [entities, setEntities] = useState<BaseEntity[]>(camelResource.getEntities());
  const [visualEntities, setVisualEntities] = useState<BaseVisualEntity[]>(camelResource.getVisualEntities());

  /**
   * Subscribe to the `code:updated` event to recreate the CamelResource
   */
  useLayoutEffect(() => {
    return eventNotifier.subscribe('code:updated', ({ code, path }) => {
      const camelResource = CamelResourceFactory.createCamelResource(code, { path });
      const entities = camelResource.getEntities();
      const visualEntities = camelResource.getVisualEntities();

      setCamelResource(camelResource);
      setEntities(entities);
      setVisualEntities(visualEntities);
    });
  }, [eventNotifier]);

  const updateSourceCodeFromEntities = useCallback(() => {
    const code = camelResource.toString();
    eventNotifier.next('entities:updated', code);
  }, [camelResource, eventNotifier]);

  const updateEntitiesFromCamelResource = useCallback(() => {
    const entities = camelResource.getEntities();
    const visualEntities = camelResource.getVisualEntities();
    setEntities(entities);
    setVisualEntities(visualEntities);

    /**
     * Notify consumers that entities has been refreshed, hence the code needs to be updated
     */
    updateSourceCodeFromEntities();
  }, [camelResource, updateSourceCodeFromEntities]);

  const value = useMemo(
    () => ({
      entities,
      visualEntities,
      currentSchemaType: camelResource?.getType(),
      camelResource,
      updateEntitiesFromCamelResource,
      updateSourceCodeFromEntities,
    }),
    [entities, visualEntities, camelResource, updateEntitiesFromCamelResource, updateSourceCodeFromEntities],
  );

  return <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>;
};
