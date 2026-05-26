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
   * chosen even when the initial emission carries no path.
   *
   * While editing, the source is transiently unparseable on many keystrokes. In that
   * case we keep the last valid resource instead of substituting one: building an empty
   * resource here would default to a Camel Route (no path is known mid-edit), flipping
   * the schema type of Kamelets/Pipes to Route and forcing the UI to re-render on every
   * invalid keystroke. Swallowing the error and not updating state mirrors the previous
   * "thrown error aborts the update" behavior, so the resource stays put until the
   * source parses again.
   *
   * Re-subscribes if `fileExtension` changes; in practice the editor remounts per file,
   * so a `fileExtension` change without a following `code:updated` event does not occur.
   */
  useLayoutEffect(() => {
    return eventNotifier.subscribe('code:updated', ({ code, path }) => {
      const resolvedPath = path ?? fileExtension;

      try {
        setKaotoResource(CamelResourceFactory.createCamelResource(code, { path: resolvedPath }));
      } catch {
        // Transiently invalid source: keep the last valid resource untouched.
      }
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
