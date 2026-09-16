import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first

import { Suggestion, SuggestionRequestContext } from '@kaoto/forms';
import { Button } from '@patternfly/react-core';
import { createRef, useEffect, useSyncExternalStore } from 'react';
import { RouterProvider } from 'react-router-dom';

import { CatalogLoaderProvider } from '../dynamic-catalog/catalog.provider';
import {
  BridgeError,
  type IEventBus,
  type JsonObject,
  type KaotoRequests,
  type KaotoResponses,
  type SettingsSnapshot,
  type Unsubscribe,
  type ValidationNotification,
} from '../host-bridge';
import { isJsonValue } from '../host-bridge/contracts';
import { CatalogKind, FileTypes, FileTypesResponse, StepUpdateAction } from '../models';
import { AbstractSettingsAdapter, DefaultSettingsAdapter } from '../models/settings';
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
import { kaotoEditorRouter } from './KaotoEditorRouter';

export interface KaotoEditorInit {
  fileExtension: string;
  resourcesPathPrefix: string;
  isReadOnly: boolean;
  /** Restart the embedding after a pre-edit failure without navigating its frame. */
  onRetry?: () => void;
}

/** Subscribe before requesting settings so a late response cannot overwrite a newer push. */
export async function createKaotoEditor(bus: IEventBus, init: KaotoEditorInit): Promise<KaotoEditorApp> {
  let newest: SettingsSnapshot | undefined;
  let app: KaotoEditorApp | undefined;
  const apply = (snapshot: SettingsSnapshot) => {
    if (newest && snapshot.settingsVersion <= newest.settingsVersion) return;
    newest = snapshot;
    app?.updateSettings(new DefaultSettingsAdapter(snapshot.settings));
  };
  const unsubscribe = bus.on('editor:settings:updated', apply);
  try {
    apply(await bus.request('editor:settings:get', null));
    app = new KaotoEditorApp(bus, init, new DefaultSettingsAdapter(newest!.settings), unsubscribe);
    return app;
  } catch (error) {
    unsubscribe();
    throw error;
  }
}

export class KaotoEditorApp {
  protected readonly editorRef = createRef<SourceCodeBridgeProviderRef>();
  private readonly listeners = new Set<() => void>();
  private readonly document;
  private state: { settingsAdapter: AbstractSettingsAdapter; document: EditorDocumentState };
  private disposed = false;
  private mounts = 0;
  af_isReact = true;
  af_componentId = 'kaoto-editor';
  af_componentTitle = 'Kaoto Editor';

  constructor(
    private readonly bus: IEventBus,
    private readonly initArgs: KaotoEditorInit,
    settingsAdapter: AbstractSettingsAdapter,
    private readonly unsubscribeSettings: Unsubscribe = () => {},
  ) {
    this.document = bindEditorDocument(bus, this.editorRef, () => {
      this.state = { ...this.state, document: this.document.getState() };
      this.listeners.forEach((listener) => {
        listener();
      });
    });
    this.state = { settingsAdapter, document: this.document.getState() };
  }

  updateSettings(settingsAdapter: AbstractSettingsAdapter) {
    if (this.disposed) return;
    this.state = { ...this.state, settingsAdapter };
    setColorScheme(settingsAdapter.getSettings().colorScheme);
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  suspend(error: Error) {
    if (!this.disposed) this.document.suspend(error);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeSettings();
    this.document.dispose();
    this.bus.dispose();
    this.listeners.clear();
  }

  private async request<R extends keyof KaotoRequests>(
    request: R,
    payload: KaotoRequests[R],
  ): Promise<KaotoResponses[R]> {
    try {
      return await this.bus.request(request, payload);
    } catch (error) {
      if (error instanceof BridgeError && ['NOT_CONNECTED', 'DISPOSED'].includes(error.code)) this.suspend(error);
      throw error;
    }
  }

  sendReady = () => {
    this.document.ready();
  };
  sendNewEdit = async (content: string) => {
    this.document.notifyChange(content);
  };
  private readonly applyHistory = (command: 'undo' | 'redo') => {
    void this.document.applyHistory(command).catch((error: unknown) => {
      if (this.disposed) return;
      this.bus.emit('host:notification:show', {
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not apply document history',
      });
    });
  };
  sendNotifications = (path: string, notifications: ValidationNotification[]) => {
    this.bus.emit('editor:notifications:set', { path, notifications });
  };

  getMetadata = async <T,>(key: string): Promise<T | undefined> => {
    const { value } = await this.request('editor:metadata:get', { key });
    return value === null ? undefined : (value as T);
  };
  setMetadata = async <T,>(key: string, preferences: T): Promise<void> => {
    const payload = { key, value: preferences ?? null };
    if (!isJsonValue(payload.value)) throw new BridgeError('INVALID_MESSAGE', 'Metadata must be JSON');
    await this.request('editor:metadata:set', payload);
  };
  getResourcesContentByType = async (fileType: FileTypes): Promise<FileTypesResponse[]> => {
    return (await this.request('editor:resource:getByType', { fileType })).resources;
  };
  getResourceContent = async (path: string): Promise<string | undefined> => {
    return (await this.request('editor:resource:getContent', { path })).content ?? undefined;
  };
  isResourceExist = async (path: string): Promise<boolean> => {
    return (await this.request('editor:resource:exists', { path })).exists;
  };
  saveResourceContent = async (path: string, content: string): Promise<void> => {
    await this.request('editor:resource:save', { path, content });
  };
  deleteResource = async (path: string): Promise<boolean> => {
    return (await this.request('editor:resource:delete', { path })).success;
  };
  askUserForFileSelection = async (
    include: string,
    exclude?: string,
    options?: Record<string, unknown>,
  ): Promise<string[] | string | undefined> => {
    return (
      (
        await this.request('host:ui:pickFile', {
          include,
          ...(exclude === undefined ? {} : { exclude }),
          ...(options === undefined
            ? {}
            : { options: Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)) }),
        })
      ).selection ?? undefined
    );
  };
  getSuggestions = async (topic: string, word: string, context?: SuggestionRequestContext): Promise<Suggestion[]> => {
    try {
      return (
        await this.request('editor:suggestions:get', {
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
  };
  getRuntimeInfoFromMavenContext = async () => {
    try {
      return (await this.request('editor:maven:getRuntimeInfo', null)).runtimeInfo ?? undefined;
    } catch (error) {
      if (error instanceof BridgeError && error.code === 'UNSUPPORTED_REQUEST') return undefined;
      throw error;
    }
  };
  onStepUpdated = async (action: StepUpdateAction, stepType: CatalogKind, stepName: string): Promise<void> => {
    this.bus.emit('editor:step:updated', { action, stepType, stepName });
  };

  af_onOpen(): void {
    setColorScheme(this.state.settingsAdapter.getSettings().colorScheme);
  }

  private readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private readonly getState = () => this.state;

  private readonly Root = () => {
    const state = useSyncExternalStore(this.subscribe, this.getState);
    const settings = state.settingsAdapter.getSettings();
    // VS Code exposes history commands, but not native stack availability. Let it decide at the boundary.
    const history = state.document.nativeUndoRedo
      ? {
          undo: () => {
            this.applyHistory('undo');
          },
          redo: () => {
            this.applyHistory('redo');
          },
          canUndo: !state.document.historyPending,
          canRedo: !state.document.historyPending,
        }
      : undefined;
    useEffect(() => {
      this.mounts++;
      return () => {
        this.mounts--;
        // React Strict Mode replays mount effects. Dispose only after a real unmount.
        queueMicrotask(() => {
          if (this.mounts === 0) this.dispose();
        });
      };
    }, []);
    return (
      <>
        {state.document.error && (
          <div role="alert">
            {state.document.error.message}
            {!state.document.initialized && (
              <Button
                variant="link"
                onClick={() => {
                  this.dispose();
                  if (this.initArgs.onRetry) this.initArgs.onRetry();
                  else window.location.reload();
                }}
              >
                Retry
              </Button>
            )}
          </div>
        )}
        {!state.document.initialized && !state.document.error && <output>Loading document…</output>}
        <div
          inert={
            !state.document.initialized ||
            state.document.readonly ||
            this.initArgs.isReadOnly ||
            !!state.document.error ||
            state.document.historyPending
          }
          aria-busy={!state.document.initialized}
        >
          <ReloadProvider>
            <SettingsProvider adapter={state.settingsAdapter}>
              <SourceCodeSync>
                <SourceCodeBridgeProvider ref={this.editorRef} onNewEdit={this.sendNewEdit} history={history}>
                  <KaotoResourceProvider fileExtension={this.initArgs.fileExtension}>
                    <RuntimeProvider
                      catalogUrl={settings.catalogUrl}
                      runtimeCatalogName={settings.runtimeCatalogName}
                      testingCatalogName={settings.testingCatalogName}
                    >
                      <CatalogLoaderProvider getResourcesContentByType={this.getResourcesContentByType}>
                        <EntitiesProvider>
                          <KaotoBridge
                            onReady={this.sendReady}
                            getMetadata={this.getMetadata}
                            setMetadata={this.setMetadata}
                            getResourceContent={this.getResourceContent}
                            saveResourceContent={this.saveResourceContent}
                            isResourceExist={this.isResourceExist}
                            deleteResource={this.deleteResource}
                            askUserForFileSelection={this.askUserForFileSelection}
                            getSuggestions={this.getSuggestions}
                            shouldSaveSchema={false}
                            onStepUpdated={this.onStepUpdated}
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
      </>
    );
  };

  af_componentRoot() {
    return <this.Root />;
  }
}
