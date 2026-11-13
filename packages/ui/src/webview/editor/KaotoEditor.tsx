import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first

import { Suggestion, SuggestionRequestContext } from '@kaoto/forms';
import { Button } from '@patternfly/react-core';
import { PropsWithChildren, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { RouterProvider } from 'react-router';

import { CatalogLoaderProvider } from '../../dynamic-catalog/catalog.provider';
import {
  BridgeError,
  IEventBus,
  JsonObject,
  KaotoRequests,
  KaotoResponses,
  SettingsSnapshot,
  toJsonValue,
} from '../../host-bridge/contracts';
import { HostBridgeProvider } from '../../host-bridge/react/context';
import { CatalogKind, FileTypes, FileTypesResponse, StepUpdateAction } from '../../models';
import { DefaultSettingsAdapter } from '../../models/settings';
import { KaotoResourceProvider } from '../../providers';
import { EntitiesProvider } from '../../providers/entities.provider';
import { ReloadProvider } from '../../providers/reload.provider';
import { RuntimeProvider } from '../../providers/runtime.provider';
import { SettingsContext, SettingsProvider } from '../../providers/settings.provider';
import { SourceCodeSync } from '../../providers/source-code-sync';
import { setColorScheme } from '../../utils/color-scheme';
import { bindEditorDocument, type EditorDocumentState, type SourceCodeBridgeProviderRef } from './Bridge/editor-api';
import { KaotoBridge } from './Bridge/KaotoBridge';
import { SourceCodeBridgeProvider } from './Bridge/SourceCodeBridgeProvider';
import { kaotoEditorRouter } from './KaotoEditorRouter';

export interface KaotoEditorInit {
  fileExtension: string;
  resourcesPathPrefix: string;
  isReadOnly: boolean;
  /** Restart the embedding after a pre-edit failure without navigating its frame. */
  onRetry?: () => void;
  /**
   * Registers a listener for a lost host connection and returns its unsubscribe function. A listener registered
   * after the loss is called immediately.
   */
  onDisconnect?: (listener: (error: Error) => void) => () => void;
}

/**
 * Reads the catalog settings on every render, so the "Reload with default Catalog" action, which clears the
 * catalog URL in the settings and remounts the reload boundary, loads the bundled catalog.
 */
const EditorRuntimeProvider = ({ defaultCatalogUrl, children }: PropsWithChildren<{ defaultCatalogUrl: string }>) => {
  const { catalogUrl, runtimeCatalogName, testingCatalogName } = useContext(SettingsContext).getSettings();

  return (
    <RuntimeProvider
      catalogUrl={catalogUrl || defaultCatalogUrl}
      runtimeCatalogName={runtimeCatalogName}
      testingCatalogName={testingCatalogName}
    >
      {children}
    </RuntimeProvider>
  );
};

interface Props {
  bus: IEventBus;
  initialSettings: SettingsSnapshot;
  init: KaotoEditorInit;
}

export const KaotoEditor = ({ bus, initialSettings, init }: Props) => {
  // A stable ref: the document binding below captures it once, so it must survive re-renders.
  const editorRef = useRef<SourceCodeBridgeProviderRef>(null);

  // Settings state: start from initialSettings, updated by bus events
  const [settingsAdapter, setSettingsAdapter] = useState(() => new DefaultSettingsAdapter(initialSettings.settings));
  const settingsVersionRef = useRef(initialSettings.settingsVersion);

  // Document state via useSyncExternalStore
  const docRef = useRef<ReturnType<typeof bindEditorDocument> | null>(null);
  const listenersRef = useRef(new Set<() => void>());

  docRef.current ??= bindEditorDocument(bus, editorRef, () => {
    listenersRef.current.forEach((l) => {
      l();
    });
  });

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getDocumentState = useCallback(() => docRef.current!.getState(), []);

  const documentState: EditorDocumentState = useSyncExternalStore(subscribe, getDocumentState);

  // The host resolves Auto against the VS Code theme and sends new settings when that theme changes
  useEffect(() => {
    setColorScheme(settingsAdapter.getSettings().colorScheme);
  }, [settingsAdapter]);

  // Subscribe to settings updates
  useEffect(
    () =>
      bus.on('host:settings:updated', (snapshot: SettingsSnapshot) => {
        if (snapshot.settingsVersion <= settingsVersionRef.current) return;
        settingsVersionRef.current = snapshot.settingsVersion;
        setSettingsAdapter(new DefaultSettingsAdapter(snapshot.settings));
      }),
    [bus],
  );

  // Edits made after the connection is lost would never reach the host: suspend the document and offer Retry
  useEffect(
    () =>
      init.onDisconnect?.((error) => {
        docRef.current?.suspend(error);
      }),
    [init],
  );

  // Dispose bus on unmount (with Strict Mode guard)
  const mountsRef = useRef(0);
  useEffect(() => {
    const mounts = mountsRef;
    mounts.current++;
    return () => {
      mounts.current--;
      // React Strict Mode replays mount effects. Dispose only after a real unmount.
      queueMicrotask(() => {
        if (mounts.current === 0) {
          docRef.current?.dispose();
          bus.dispose();
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The host resolves an empty catalog URL to the bundled catalog, so does the reload with the default catalog
  const defaultCatalogUrl = `${init.resourcesPathPrefix}/camel-catalog/index.json`;

  // History controls: the host owns the document history
  const applyHistory = useCallback(
    (command: 'undo' | 'redo') => {
      void docRef.current?.applyHistory(command).catch((error: unknown) => {
        bus.emit('editor:notification:raised', {
          type: 'error',
          message: error instanceof Error ? error.message : 'Could not apply document history',
        });
      });
    },
    [bus],
  );

  const history = {
    undo: () => {
      applyHistory('undo');
    },
    redo: () => {
      applyHistory('redo');
    },
    canUndo: !documentState.historyPending,
    canRedo: !documentState.historyPending,
  };

  // Bridge callbacks
  const sendReady = useCallback(() => {
    docRef.current?.ready();
  }, []);

  const sendNewEdit = useCallback((content: string) => {
    docRef.current?.notifyChange(content);
    return Promise.resolve();
  }, []);

  const request = useCallback(
    async <R extends keyof KaotoRequests>(requestName: R, payload: KaotoRequests[R]): Promise<KaotoResponses[R]> => {
      try {
        return await bus.request(requestName, payload);
      } catch (error) {
        if (error instanceof BridgeError && ['NOT_CONNECTED', 'DISPOSED'].includes(error.code)) {
          docRef.current?.suspend(error);
        }
        throw error;
      }
    },
    [bus],
  );

  const getMetadata = useCallback(
    async <T,>(key: string): Promise<T | undefined> => {
      const { value } = await request('editor:metadata:get', { key });
      return value === null ? undefined : (value as T);
    },
    [request],
  );

  const setMetadata = useCallback(
    async <T,>(key: string, preferences: T): Promise<void> => {
      await request('editor:metadata:set', { key, value: toJsonValue(preferences) });
    },
    [request],
  );

  const getResourcesContentByType = useCallback(
    async (fileType: FileTypes): Promise<FileTypesResponse[]> => {
      return (await request('editor:resource:getByType', { fileType })).resources;
    },
    [request],
  );

  const getResourceContent = useCallback(
    async (path: string): Promise<string | undefined> => {
      return (await request('editor:resource:getContent', { path })).content ?? undefined;
    },
    [request],
  );

  const isResourceExist = useCallback(
    async (path: string): Promise<boolean> => {
      return (await request('editor:resource:exists', { path })).exists;
    },
    [request],
  );

  const saveResourceContent = useCallback(
    async (path: string, content: string): Promise<void> => {
      await request('editor:resource:save', { path, content });
    },
    [request],
  );

  const deleteResource = useCallback(
    async (path: string): Promise<boolean> => {
      return (await request('editor:resource:delete', { path })).success;
    },
    [request],
  );

  const askUserForFileSelection = useCallback(
    async (
      include: string,
      exclude?: string,
      options?: Record<string, unknown>,
    ): Promise<string[] | string | undefined> => {
      return (
        (
          await request('editor:file:pick', {
            include,
            ...(exclude === undefined ? {} : { exclude }),
            ...(options === undefined
              ? {}
              : { options: Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)) }),
          })
        ).selection ?? undefined
      );
    },
    [request],
  );

  const getSuggestions = useCallback(
    async (topic: string, word: string, context?: SuggestionRequestContext): Promise<Suggestion[]> => {
      try {
        return (
          await request('editor:suggestions:get', {
            topic,
            word,
            context: Object.fromEntries(
              Object.entries(context ?? {}).filter(([, value]) => value !== undefined),
            ) as JsonObject,
          })
        ).suggestions;
      } catch {
        return [];
      }
    },
    [request],
  );

  const onStepUpdated = useCallback(
    (action: StepUpdateAction, stepType: CatalogKind, stepName: string): Promise<void> => {
      bus.emit('editor:step:updated', { action, stepType, stepName });
      return Promise.resolve();
    },
    [bus],
  );

  const handleRetry = useCallback(() => {
    docRef.current?.dispose();
    bus.dispose();
    if (init.onRetry) init.onRetry();
    else window.location.reload();
  }, [bus, init]);

  return (
    <HostBridgeProvider bus={bus}>
      {documentState.error && (
        <div role="alert">
          {documentState.error.message}
          {/* Retry restarts the editor, which the host initializes again from the text document. */}
          <Button variant="link" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      )}
      {!documentState.initialized && !documentState.error && (
        <output className="kaoto-editor-document-status">Loading document…</output>
      )}
      <div
        inert={
          !documentState.initialized ||
          documentState.readonly ||
          init.isReadOnly ||
          !!documentState.error ||
          documentState.historyPending
        }
        aria-busy={!documentState.initialized}
      >
        <SettingsProvider adapter={settingsAdapter}>
          <SourceCodeBridgeProvider ref={editorRef} onNewEdit={sendNewEdit} history={history}>
            {/* The reload boundary stays below the bridge provider, which owns the document content and its host sync */}
            <ReloadProvider>
              <SourceCodeSync>
                <KaotoResourceProvider fileExtension={init.fileExtension}>
                  <EditorRuntimeProvider defaultCatalogUrl={defaultCatalogUrl}>
                    <CatalogLoaderProvider getResourcesContentByType={getResourcesContentByType}>
                      <EntitiesProvider>
                        <KaotoBridge
                          onReady={sendReady}
                          getMetadata={getMetadata}
                          setMetadata={setMetadata}
                          getResourceContent={getResourceContent}
                          saveResourceContent={saveResourceContent}
                          isResourceExist={isResourceExist}
                          deleteResource={deleteResource}
                          askUserForFileSelection={askUserForFileSelection}
                          getSuggestions={getSuggestions}
                          shouldSaveSchema={false}
                          onStepUpdated={onStepUpdated}
                        >
                          <RouterProvider router={kaotoEditorRouter} />
                        </KaotoBridge>
                      </EntitiesProvider>
                    </CatalogLoaderProvider>
                  </EditorRuntimeProvider>
                </KaotoResourceProvider>
              </SourceCodeSync>
            </ReloadProvider>
          </SourceCodeBridgeProvider>
        </SettingsProvider>
      </div>
    </HostBridgeProvider>
  );
};
