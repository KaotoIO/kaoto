import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first

import { Suggestion, SuggestionRequestContext } from '@kaoto/forms';
import { Button } from '@patternfly/react-core';
import { createRef, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { RouterProvider } from 'react-router-dom';

import { CatalogLoaderProvider } from '../dynamic-catalog/catalog.provider';
import {
  BridgeError,
  type IEventBus,
  type JsonObject,
  type KaotoRequests,
  type KaotoResponses,
  type SettingsSnapshot,
} from '../host-bridge';
import { isJsonValue } from '../host-bridge';
import { CatalogKind, FileTypes, FileTypesResponse, StepUpdateAction } from '../models';
import { DefaultSettingsAdapter } from '../models/settings';
import { KaotoResourceProvider } from '../providers';
import { EntitiesProvider } from '../providers/entities.provider';
import { ReloadProvider } from '../providers/reload.provider';
import { RuntimeProvider } from '../providers/runtime.provider';
import { SettingsProvider } from '../providers/settings.provider';
import { SourceCodeSync } from '../providers/source-code-sync';
import { setColorScheme } from '../utils/color-scheme';
import { bindEditorDocument, type EditorDocumentState, type SourceCodeBridgeProviderRef } from './Bridge/editor-api';
import { KaotoBridge } from './Bridge/KaotoBridge';
import { SourceCodeBridgeProvider } from './Bridge/SourceCodeBridgeProvider';
import { HostBridgeProvider } from '../host-bridge/context';
import { kaotoEditorRouter } from './KaotoEditorRouter';

export interface KaotoEditorInit {
  fileExtension: string;
  resourcesPathPrefix: string;
  isReadOnly: boolean;
  /** Restart the embedding after a pre-edit failure without navigating its frame. */
  onRetry?: () => void;
}

interface Props {
  bus: IEventBus;
  initialSettings: SettingsSnapshot;
  init: KaotoEditorInit;
}

export function KaotoEditor({ bus, initialSettings, init }: Props) {
  const editorRef = createRef<SourceCodeBridgeProviderRef>();

  // Settings state: start from initialSettings, updated by bus events
  const [settingsAdapter, setSettingsAdapter] = useState(
    () => new DefaultSettingsAdapter(initialSettings.settings),
  );
  const settingsVersionRef = useRef(initialSettings.settingsVersion);

  // Document state via useSyncExternalStore
  const docRef = useRef<ReturnType<typeof bindEditorDocument> | null>(null);
  const listenersRef = useRef(new Set<() => void>());

  if (!docRef.current) {
    docRef.current = bindEditorDocument(bus, editorRef, () => {
      listenersRef.current.forEach((l) => l());
    });
  }

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getDocumentState = useCallback(() => docRef.current!.getState(), []);

  const documentState: EditorDocumentState = useSyncExternalStore(subscribe, getDocumentState);

  // Subscribe to settings updates
  useEffect(() => {
    const unsubscribe = bus.on('editor:settings:updated', (snapshot: SettingsSnapshot) => {
      if (snapshot.settingsVersion <= settingsVersionRef.current) return;
      settingsVersionRef.current = snapshot.settingsVersion;
      const adapter = new DefaultSettingsAdapter(snapshot.settings);
      setColorScheme(adapter.getSettings().colorScheme);
      setSettingsAdapter(adapter);
    });
    // Apply initial color scheme
    setColorScheme(settingsAdapter.getSettings().colorScheme);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus]);

  // Dispose bus on unmount (with Strict Mode guard)
  const mountsRef = useRef(0);
  useEffect(() => {
    mountsRef.current++;
    return () => {
      mountsRef.current--;
      // React Strict Mode replays mount effects. Dispose only after a real unmount.
      queueMicrotask(() => {
        if (mountsRef.current === 0) {
          docRef.current?.dispose();
          bus.dispose();
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settings = settingsAdapter.getSettings();

  // History controls (native undo/redo delegated to host)
  const applyHistory = useCallback(
    (command: 'undo' | 'redo') => {
      void docRef.current?.applyHistory(command).catch((error: unknown) => {
        bus.emit('host:notification:show', {
          type: 'error',
          message: error instanceof Error ? error.message : 'Could not apply document history',
        });
      });
    },
    [bus],
  );

  const history = documentState.nativeUndoRedo
    ? {
        undo: () => applyHistory('undo'),
        redo: () => applyHistory('redo'),
        canUndo: !documentState.historyPending,
        canRedo: !documentState.historyPending,
      }
    : undefined;

  // Bridge callbacks
  const sendReady = useCallback(() => {
    docRef.current?.ready();
  }, []);

  const sendNewEdit = useCallback(async (content: string) => {
    docRef.current?.notifyChange(content);
  }, []);

  const request = useCallback(
    async <R extends keyof KaotoRequests>(
      requestName: R,
      payload: KaotoRequests[R],
    ): Promise<KaotoResponses[R]> => {
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
      const payload = { key, value: preferences ?? null };
      if (!isJsonValue(payload.value)) throw new BridgeError('INVALID_MESSAGE', 'Metadata must be JSON');
      await request('editor:metadata:set', payload);
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
          await request('host:ui:pickFile', {
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
    async (action: StepUpdateAction, stepType: CatalogKind, stepName: string): Promise<void> => {
      bus.emit('editor:step:updated', { action, stepType, stepName });
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
          {!documentState.initialized && (
            <Button variant="link" onClick={handleRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
      {!documentState.initialized && !documentState.error && (
        <output role="status">Loading document…</output>
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
        <ReloadProvider>
          <SettingsProvider adapter={settingsAdapter}>
            <SourceCodeSync>
              <SourceCodeBridgeProvider ref={editorRef} onNewEdit={sendNewEdit} history={history}>
                <KaotoResourceProvider fileExtension={init.fileExtension}>
                  <RuntimeProvider
                    catalogUrl={settings.catalogUrl}
                    runtimeCatalogName={settings.runtimeCatalogName}
                    testingCatalogName={settings.testingCatalogName}
                  >
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
                  </RuntimeProvider>
                </KaotoResourceProvider>
              </SourceCodeBridgeProvider>
            </SourceCodeSync>
          </SettingsProvider>
        </ReloadProvider>
      </div>
    </HostBridgeProvider>
  );
}
