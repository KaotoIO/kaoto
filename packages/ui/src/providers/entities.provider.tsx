import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useKaotoResourceContext } from '../hooks/useKaotoResourceContext/useKaotoResourceContext';
import { BaseVisualEntity } from '../models';
import { SourceSchemaType } from '../models/camel';
import { BaseEntity } from '../models/entities';
import { KaotoResource } from '../models/kaoto-resource';
import { CamelRouteVisualEntity } from '../models/visualization/flows';
import { useSourceCodeStore } from '../store';
import { EventNotifier } from '../utils';

export interface EntitiesContextResult {
  entities: BaseEntity[];
  currentSchemaType: SourceSchemaType;
  visualEntities: BaseVisualEntity[];
  camelResource: KaotoResource;
  /** A source replacement is still being initialized. */
  isLoading?: boolean;

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
  const [initializedResource, setInitializedResource] = useState<KaotoResource>();
  const [entities, setEntities] = useState<BaseEntity[]>([]);
  const [visualEntities, setVisualEntities] = useState<BaseVisualEntity[]>([]);
  const previousRoutes = useRef<
    | {
        path?: string;
        type: SourceSchemaType;
        routes: CamelRouteVisualEntity[];
      }
    | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    const path = useSourceCodeStore.getState().path;
    const type = kaotoResource.getType();
    const init = async () => {
      try {
        await kaotoResource.initialize();
        if (cancelled) return;
        const nextEntities = kaotoResource.getEntities();
        const nextVisualEntities = kaotoResource.getVisualEntities();
        const routes = nextVisualEntities.filter((entity) => entity instanceof CamelRouteVisualEntity);
        const previous = previousRoutes.current;
        // Parameter edits must not replace the canvas identity of routes without an authored ID.
        // Reuse positions only within the same document and unchanged route list length.
        if (previous?.path === path && previous?.type === type && previous.routes.length === routes.length) {
          const routeIds = routes.map((route, index) => {
            const prior = previous.routes[index];
            return route.hasGeneratedId && prior.hasGeneratedId ? prior.id : route.id;
          });
          const usedIds = new Set(
            [...nextEntities, ...nextVisualEntities]
              .filter((entity) => !(entity instanceof CamelRouteVisualEntity))
              .map((entity) => entity.id),
          );
          // Validate final IDs together; temporary generated IDs may collide with previous ones.
          const canReuseIds = routeIds.every((id) => {
            if (usedIds.has(id)) return false;
            usedIds.add(id);
            return true;
          });
          if (canReuseIds) {
            routes.forEach((route, index) => {
              route.setId(routeIds[index]);
            });
          }
        }
        previousRoutes.current = { path, type, routes };
        setInitializedResource(kaotoResource);
        setEntities(nextEntities);
        setVisualEntities(nextVisualEntities);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to initialize KaotoResource', error);
        setEntities([]);
        setVisualEntities([]);
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
      isLoading: initializedResource !== kaotoResource,
      updateEntitiesFromCamelResource,
      updateSourceCodeFromEntities,
    }),
    [
      entities,
      visualEntities,
      kaotoResource,
      initializedResource,
      updateEntitiesFromCamelResource,
      updateSourceCodeFromEntities,
    ],
  );

  return <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>;
};
