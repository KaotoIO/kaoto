import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
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
  currentSchemaType: SourceSchemaType | undefined;
  visualEntities: BaseVisualEntity[];
  camelResource: KaotoResource | undefined;
  isLoading: boolean;

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

  const [camelResource, setCamelResource] = useState<KaotoResource | undefined>(undefined);
  const [entities, setEntities] = useState<BaseEntity[]>([]);
  const [visualEntities, setVisualEntities] = useState<BaseVisualEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load resource asynchronously on mount
   */
  useEffect(() => {
    let cancelled = false;

    async function initializeResource() {
      setIsLoading(true);
      try {
        const resource = await CamelResourceFactory.createCamelResource(initialSourceCode, { path: fileExtension });
        if (!cancelled) {
          setCamelResource(resource);
          setEntities(resource.getEntities());
          setVisualEntities(resource.getVisualEntities());
        }
      } catch (error) {
        console.error('Error creating initial resource:', error);
        try {
          const emptyResource = await CamelResourceFactory.createCamelResource('', { path: fileExtension });
          if (!cancelled) {
            setCamelResource(emptyResource);
            setEntities(emptyResource.getEntities());
            setVisualEntities(emptyResource.getVisualEntities());
          }
        } catch (fallbackError) {
          console.error('Error creating empty resource:', fallbackError);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    initializeResource();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileExtension]);

  /**
   * Subscribe to the `code:updated` event to recreate the CamelResource
   */
  useLayoutEffect(() => {
    return eventNotifier.subscribe('code:updated', async ({ code, path }) => {
      setIsLoading(true);
      try {
        const camelResource = await CamelResourceFactory.createCamelResource(code, { path });
        const entities = camelResource.getEntities();
        const visualEntities = camelResource.getVisualEntities();

        setCamelResource((_prevState) => camelResource);
        setEntities((_prevState) => entities);
        setVisualEntities((_prevState) => visualEntities);
      } catch (error) {
        console.error('Error updating resource from code:', error);
      } finally {
        setIsLoading(false);
      }
    });
  }, [eventNotifier]);

  const updateSourceCodeFromEntities = useCallback(() => {
    if (!camelResource) return;

    camelResource
      .toStringAsync()
      .then((code) => {
        eventNotifier.next('entities:updated', code);
      })
      .catch((error) => {
        console.error('Error serializing resource to code:', error);
      });
  }, [camelResource, eventNotifier]);

  const updateEntitiesFromCamelResource = useCallback(() => {
    if (!camelResource) return;

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
      isLoading,
      updateEntitiesFromCamelResource,
      updateSourceCodeFromEntities,
    }),
    [entities, visualEntities, camelResource, isLoading, updateEntitiesFromCamelResource, updateSourceCodeFromEntities],
  );

  return <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>;
};
