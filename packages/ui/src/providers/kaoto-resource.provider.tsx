import { createContext, FunctionComponent, PropsWithChildren, useLayoutEffect, useMemo, useState } from 'react';

import { Loading } from '../components/Loading';
import { CamelResourceFactory } from '../models/camel/camel-resource-factory';
import { KaotoResource } from '../models/kaoto-resource';
import { EventNotifier } from '../utils';

export enum ResourceParseState {
  Valid = 'Valid',
  Empty = 'Empty',
  Error = 'Error',
}

export interface KaotoResourceContextResult {
  kaotoResource?: KaotoResource;
  /**
   * The parse outcome of the last `code:updated` event.
   * Undefined before the first document arrives.
   * Valid  — parsed successfully.
   * Empty  — reserved for future use (parsed OK, no entities).
   * Error  — parser threw; the store still holds the original content.
   */
  parseState?: ResourceParseState;
  /** Set only when parseState === Error. */
  parsedError?: string;
}

export const KaotoResourceContext = createContext<KaotoResourceContextResult | null>(null);

interface KaotoResourceProviderProps extends PropsWithChildren {
  fileExtension?: string;
}

export const KaotoResourceProvider: FunctionComponent<KaotoResourceProviderProps> = ({ fileExtension, children }) => {
  const eventNotifier = EventNotifier.getInstance();

  const [kaotoResource, setKaotoResource] = useState<KaotoResource | undefined>();
  const [parseState, setParseState] = useState<ResourceParseState | undefined>();
  const [parsedError, setParsedError] = useState<string | undefined>();

  /**
   * Subscribe to the `code:updated` event to (re)create the CamelResource.
   * Reconcile the event's `path` with `fileExtension` so the correct serializer is
   * chosen even when the initial emission carries no path.
   *
   * While editing, the source is transiently unparseable on many keystrokes. In that
   * case we keep the last valid resource instead of substituting one: building an empty
   * resource here would default to a Camel Route when no path is known, flipping the
   * schema type of Kamelets/Pipes to Route and forcing the UI to re-render on every
   * invalid keystroke. The resource stays put until the source parses again.
   *
   * When there is no previous resource (the very first document does not parse), an empty
   * resource for the resolved path is provided instead, so the editor does not stay on the
   * loader forever and the user can fix the source in the code editor.
   *
   * Re-subscribes if `fileExtension` changes; in practice the editor remounts per file,
   * so a `fileExtension` change without a following `code:updated` event does not occur.
   */
  useLayoutEffect(() => {
    return eventNotifier.subscribe('code:updated', ({ code, path }) => {
      const resolvedPath = path ?? fileExtension;

      try {
        setKaotoResource(CamelResourceFactory.createCamelResource(code, { path: resolvedPath }));
        setParseState(ResourceParseState.Valid);
        setParsedError(undefined);
      } catch (err) {
        // Invalid source: keep the last valid resource, or fall back to an empty one if there is none yet.
        setKaotoResource(
          (previous) => previous ?? CamelResourceFactory.createCamelResource('', { path: resolvedPath }),
        );
        setParseState(ResourceParseState.Error);
        setParsedError(err instanceof Error ? err.message : 'The file could not be parsed');
      }
    });
  }, [eventNotifier, fileExtension]);

  const value = useMemo(
    () => ({
      kaotoResource,
      parseState,
      parsedError,
    }),
    [kaotoResource, parseState, parsedError],
  );

  if (!kaotoResource) {
    return (
      <Loading fullPage data-testid="loading-kaoto-resource">
        Loading Kaoto resource...
      </Loading>
    );
  }

  return <KaotoResourceContext.Provider value={value}>{children}</KaotoResourceContext.Provider>;
};
