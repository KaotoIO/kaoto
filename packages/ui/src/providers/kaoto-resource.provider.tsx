import { createContext, FunctionComponent, PropsWithChildren, useLayoutEffect, useMemo, useState } from 'react';

import { CamelResourceFactory } from '../models/camel/camel-resource-factory';
import { KaotoResource } from '../models/kaoto-resource';
import { EventNotifier } from '../utils';

export interface KaotoResourceContextResult {
  kaotoResource: KaotoResource;
}

export const KaotoResourceContext = createContext<KaotoResourceContextResult | null>(null);

interface KaotoResourceProviderProps extends PropsWithChildren {
  fileExtension?: string;
}

export const KaotoResourceProvider: FunctionComponent<KaotoResourceProviderProps> = ({ fileExtension, children }) => {
  const eventNotifier = EventNotifier.getInstance();

  /**
   * Start with an empty resource. The real source code arrives through the single
   * `code:updated` ingress, emitted on mount by the SourceCodeSync. Using a lazy
   * initializer avoids re-parsing the YAML on every render.
   */
  const [kaotoResource, setKaotoResource] = useState<KaotoResource>(() =>
    CamelResourceFactory.createCamelResource('', { path: fileExtension }),
  );

  /**
   * Subscribe to the `code:updated` event to (re)create the CamelResource.
   * Reconcile the event's `path` with `fileExtension` so the correct serializer is
   * chosen even when the initial emission carries no path. Malformed code falls back
   * to an empty resource (keeping the same serializer), preserving the previous
   * "wrong source code -> empty resource" behavior now that the initial code also
   * flows through this handler.
   *
   * Re-subscribes if `fileExtension` changes; in practice the editor remounts per file,
   * so a `fileExtension` change without a following `code:updated` event does not occur.
   */
  useLayoutEffect(() => {
    return eventNotifier.subscribe('code:updated', ({ code, path }) => {
      const resolvedPath = path ?? fileExtension;
      let resource: KaotoResource;

      try {
        resource = CamelResourceFactory.createCamelResource(code, { path: resolvedPath });
      } catch {
        // While editing, the source is transiently invalid on almost every keystroke.
        // Fall back to an empty resource (same serializer) without logging or throwing.
        resource = CamelResourceFactory.createCamelResource('', { path: resolvedPath });
      }

      setKaotoResource(resource);
    });
  }, [eventNotifier, fileExtension]);

  const value = useMemo(
    () => ({
      kaotoResource,
    }),
    [kaotoResource],
  );

  return <KaotoResourceContext.Provider value={value}>{children}</KaotoResourceContext.Provider>;
};
