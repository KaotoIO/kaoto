import { Content, ContentVariants } from '@patternfly/react-core';
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

import { Loading } from '../components/Loading';
import { useKaotoResourceContext } from '../hooks/useKaotoResourceContext/useKaotoResourceContext';
import { BaseVisualEntity } from '../models';
import { SourceSchemaType } from '../models/camel';
import { BaseEntity } from '../models/entities';
import { KaotoResource } from '../models/kaoto-resource';
import { EventNotifier } from '../utils';
import { ResourceParseState } from './kaoto-resource.provider';

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

  const { kaotoResource, parseState } = useKaotoResourceContext();
  /**
   * The resource is initialized asynchronously. A new resource only becomes visible to consumers together with its own
   * entities, in a single update; until then the previous resource and its entities stay in place (and nothing is
   * rendered before the first one is ready, to avoid flashing an empty canvas).
   */
  const [ready, setReady] = useState<{
    resource: KaotoResource;
    entities: BaseEntity[];
    visualEntities: BaseVisualEntity[];
  }>();

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await kaotoResource.initialize();
        if (cancelled) return;
        setReady({
          resource: kaotoResource,
          entities: kaotoResource.getEntities(),
          visualEntities: kaotoResource.getVisualEntities(),
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to initialize KaotoResource', error);
        setReady({ resource: kaotoResource, entities: [], visualEntities: [] });
      }
    };
    void init();

    return () => {
      cancelled = true;
    };
  }, [kaotoResource]);

  const readyResource = ready?.resource;

  /** The resource of the latest document, read after an asynchronous serialization */
  const currentResourceRef = useRef(kaotoResource);
  useEffect(() => {
    currentResourceRef.current = kaotoResource;
  }, [kaotoResource]);

  const updateSourceCodeFromEntities = useCallback(() => {
    // Block writes while the current resource is still initializing, or while it is an empty
    // fallback for a document that did not parse. In both cases the store already holds the
    // correct content (the host document or the broken YAML) and serializing the stale/empty
    // resource would overwrite it and corrupt the host's copy of the file.
    if (parseState === ResourceParseState.Error || readyResource !== kaotoResource) return;
    void readyResource.toSourceCode().then((code) => {
      // A newer document replaced the resource while it was serialized, e.g. the host opened another file: its code
      // must not overwrite the new document.
      if (currentResourceRef.current !== readyResource) return;
      eventNotifier.next('entities:updated', code);
    });
  }, [readyResource, kaotoResource, parseState, eventNotifier]);

  const updateEntitiesFromCamelResource = useCallback(() => {
    if (parseState === ResourceParseState.Error || !readyResource || readyResource !== kaotoResource) return;
    const entities = readyResource.getEntities();
    const visualEntities = readyResource.getVisualEntities();
    setReady({ resource: readyResource, entities, visualEntities });

    /**
     * Notify consumers that entities has been refreshed, hence the code needs to be updated
     */
    updateSourceCodeFromEntities();
  }, [readyResource, kaotoResource, parseState, updateSourceCodeFromEntities]);

  const value = useMemo(
    () =>
      ready && {
        entities: ready.entities,
        visualEntities: ready.visualEntities,
        currentSchemaType: ready.resource.getType(),
        camelResource: ready.resource,
        updateEntitiesFromCamelResource,
        updateSourceCodeFromEntities,
      },
    [ready, updateEntitiesFromCamelResource, updateSourceCodeFromEntities],
  );

  if (!value) {
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
