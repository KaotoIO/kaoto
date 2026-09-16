import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';

import {
  BridgeError,
  createEventBus,
  createMemoryTransports,
  createPostMessageBridge,
  type IEventBus,
  type SettingsSnapshot,
} from '../host-bridge';
import { CatalogKind, ColorScheme, FileTypes, SettingsModel, StepUpdateAction } from '../models';
import { useSourceCodeStore } from '../store';
import { EventNotifier } from '../utils';
import { setColorScheme } from '../utils/color-scheme';
import { createKaotoEditor, type KaotoEditorApp } from './KaotoEditorApp';

vi.mock('react-router-dom');
vi.mock('../utils/color-scheme');
vi.mock('../providers/runtime.provider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../providers/runtime.provider')>()),
  RuntimeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../dynamic-catalog/catalog.provider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../dynamic-catalog/catalog.provider')>()),
  CatalogLoaderProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const init = { fileExtension: 'yaml', resourcesPathPrefix: 'embedded', isReadOnly: false };
const documentInit = {
  reason: 'init',
  fileUri: 'route.camel.yaml',
  content: '',
  isDirty: null,
  readonly: false,
  saveAcknowledgements: false,
} as const;

describe('KaotoEditorApp bridge', () => {
  let host: IEventBus;
  let editor: IEventBus;
  let app: KaotoEditorApp | undefined;
  beforeEach(async () => {
    vi.clearAllMocks();
    host = createEventBus({ role: 'host', onError: vi.fn() });
    editor = createEventBus({
      role: 'editor',
      onError: (error) => {
        app?.suspend(error);
      },
    });
    const transports = createMemoryTransports();
    await Promise.all([
      createPostMessageBridge({ bus: host, transport: transports.host }).connect(),
      createPostMessageBridge({ bus: editor, transport: transports.editor }).connect(),
    ]);
  });
  afterEach(() => {
    app?.dispose();
    app = undefined;
    host.dispose();
    editor.dispose();
  });
  async function createApp() {
    host.onRequest('editor:settings:get', () => ({ settings: { ...new SettingsModel() }, settingsVersion: 0 }));
    app = await createKaotoEditor(editor, init);
    return app;
  }

  it('uses a newer pushed settings snapshot instead of a late initial response', async () => {
    const initial = deferred<SettingsSnapshot>();
    const requested = vi.fn(() => initial.promise);
    host.onRequest('editor:settings:get', requested);
    const pending = createKaotoEditor(editor, init);
    await vi.waitFor(() => {
      expect(requested).toHaveBeenCalled();
    });
    host.emit('editor:settings:updated', {
      settings: { ...new SettingsModel({ colorScheme: ColorScheme.Dark }) },
      settingsVersion: 2,
    });
    initial.resolve({ settings: { ...new SettingsModel({ colorScheme: ColorScheme.Light }) }, settingsVersion: 1 });
    app = await pending;
    app.af_onOpen();
    expect(setColorScheme).toHaveBeenLastCalledWith(ColorScheme.Dark);
    host.emit('editor:settings:updated', {
      settings: { ...new SettingsModel({ colorScheme: ColorScheme.Light }) },
      settingsVersion: 0,
    });
    await host.request('editor:document:getContent', null).catch(() => {});
    app.af_onOpen();
    expect(setColorScheme).toHaveBeenLastCalledWith(ColorScheme.Dark);
  });

  it('fails settings initialization and removes the failed attempt listener', async () => {
    const unsubscribe = host.onRequest('editor:settings:get', () => {
      throw new BridgeError('IO_ERROR', 'settings unavailable');
    });
    await expect(createKaotoEditor(editor, init)).rejects.toMatchObject({ code: 'IO_ERROR' });
    unsubscribe();
    await createApp();
    app!.af_onOpen();
    expect(setColorScheme).toHaveBeenLastCalledWith(ColorScheme.Auto);
  });

  it('keeps the existing tree disabled until content is installed and preserves it on disconnect', async () => {
    await createApp();
    const ready = vi.fn();
    host.on('editor:ready', ready);
    const view = render(app!.af_componentRoot());
    await waitFor(() => {
      expect(ready).toHaveBeenCalledTimes(1);
    });
    expect(view.container.querySelector('[inert]')).not.toBeNull();
    await act(async () => {
      await host.request('editor:document:setContent', documentInit);
    });
    expect(view.container.querySelector('[inert]')).toBeNull();
    act(() => {
      EventNotifier.getInstance().next('code:updated', { code: 'unsaved' });
    });
    await expect(host.request('editor:document:getContent', null)).resolves.toEqual({
      content: 'unsaved',
      revision: 1,
    });
    act(() => {
      app!.suspend(new BridgeError('NOT_CONNECTED', 'Connection lost'));
    });
    expect(view.getByRole('alert')).toHaveTextContent('Connection lost');
    expect(view.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(view.container.querySelector('[inert]')).not.toBeNull();
    view.unmount();
  });

  it('offers a reload before initialization without enabling edits after a read failure', async () => {
    await createApp();
    const view = render(app!.af_componentRoot());
    act(() => {
      app!.suspend(new BridgeError('IO_ERROR', 'Could not read document'));
    });
    expect(view.getByRole('alert')).toHaveTextContent('Could not read document');
    expect(view.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(view.container.querySelector('[inert]')).not.toBeNull();
    await expect(host.request('editor:document:getContent', null)).rejects.toMatchObject({ code: 'IO_ERROR' });
    view.unmount();
  });

  it('lets the host restart a failed initialization without navigating its webview', async () => {
    const onRetry = vi.fn();
    const retryInit = { ...init, onRetry };
    host.onRequest('editor:settings:get', () => ({ settings: { ...new SettingsModel() }, settingsVersion: 0 }));
    app = await createKaotoEditor(editor, retryInit);
    const view = render(app.af_componentRoot());
    act(() => {
      app!.suspend(new BridgeError('TIMEOUT', 'Initialization timed out'));
    });
    fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await expect(host.request('editor:document:getContent', null)).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    view.unmount();
  });

  it('retains one ready signal and history through Strict Mode and later settings updates', async () => {
    await createApp();
    const ready = vi.fn();
    host.on('editor:ready', ready);
    const view = render(<StrictMode>{app!.af_componentRoot()}</StrictMode>);
    await waitFor(() => {
      expect(ready).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await host.request('editor:document:setContent', documentInit);
    });
    act(() => {
      useSourceCodeStore.getState().setCodeAndNotify('edited');
    });
    const history = useSourceCodeStore.temporal.getState().pastStates;
    await act(async () => {
      host.emit('editor:settings:updated', {
        settings: { ...new SettingsModel({ colorScheme: ColorScheme.Dark }) },
        settingsVersion: 3,
      });
      await host.request('editor:document:setContent', documentInit);
    });
    expect(useSourceCodeStore.temporal.getState().pastStates).toBe(history);
    await expect(host.request('editor:document:getContent', null)).resolves.toEqual({ content: 'edited', revision: 1 });
    expect(ready).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('translates existing metadata and resource facades to JSON requests', async () => {
    await createApp();
    const metadata = vi.fn(() => ({ value: null }));
    host.onRequest('editor:metadata:get', metadata);
    const setMetadata = vi.fn(() => null);
    host.onRequest('editor:metadata:set', setMetadata);
    const getContent = vi.fn(() => ({ content: null }));
    host.onRequest('editor:resource:getContent', getContent);
    const save = vi.fn(() => null);
    host.onRequest('editor:resource:save', save);
    host.onRequest('editor:resource:exists', () => ({ exists: true }));
    host.onRequest('editor:resource:delete', () => ({ success: false }));
    const resources = [{ filename: 'nested/test.kamelet.yaml', content: 'kind: Kamelet' }];
    host.onRequest('editor:resource:getByType', () => ({ resources }));
    await expect(app!.getMetadata('key')).resolves.toBeUndefined();
    await app!.setMetadata('key', undefined);
    expect(setMetadata).toHaveBeenCalledWith({ key: 'key', value: null }, expect.anything());
    await expect(app!.getResourceContent('path')).resolves.toBeUndefined();
    await app!.saveResourceContent('path', 'content');
    expect(save).toHaveBeenCalledWith({ path: 'path', content: 'content' }, expect.anything());
    await expect(app!.isResourceExist('path')).resolves.toBe(true);
    await expect(app!.deleteResource('path')).resolves.toBe(false);
    await expect(app!.getResourcesContentByType(FileTypes.Kamelets)).resolves.toEqual(resources);
  });

  it('preserves picker cancellation, selection shapes and suggestion fallback', async () => {
    await createApp();
    const pick = vi
      .fn()
      .mockResolvedValueOnce({ selection: null })
      .mockResolvedValueOnce({ selection: 'one' })
      .mockResolvedValueOnce({ selection: ['one', 'two'] });
    host.onRequest('host:ui:pickFile', pick);
    await expect(app!.askUserForFileSelection('**/*')).resolves.toBeUndefined();
    await expect(app!.askUserForFileSelection('**/*', '**/*.log', { canPickMany: false, title: 'Pick' })).resolves.toBe(
      'one',
    );
    await expect(app!.askUserForFileSelection('**/*')).resolves.toEqual(['one', 'two']);
    const suggest = vi
      .fn()
      .mockResolvedValueOnce({ suggestions: [{ value: 'test' }] })
      .mockRejectedValueOnce(new Error('suggest failed'));
    host.onRequest('editor:suggestions:get', suggest);
    const context = { propertyName: 'uri', inputValue: 't', cursorPosition: undefined };
    await expect(app!.getSuggestions('uri', 't', context)).resolves.toEqual([{ value: 'test' }]);
    expect(suggest).toHaveBeenCalledWith(
      { topic: 'uri', word: 't', context: { propertyName: 'uri', inputValue: 't' } },
      expect.anything(),
    );
    await expect(app!.getSuggestions('uri', 't', context)).resolves.toEqual([]);
  });

  it('times out suggestions without breaking the existing facade', async () => {
    await createApp();
    host.onRequest('editor:suggestions:get', () => new Promise(() => {}));
    await expect(app!.getSuggestions('uri', 't', { propertyName: 'uri', inputValue: 't' })).resolves.toEqual([]);
  });

  it('emits step updates and notifications once and keeps Maven information available', async () => {
    await createApp();
    const step = vi.fn();
    host.on('editor:step:updated', step);
    const notifications = vi.fn();
    host.on('editor:notifications:set', notifications);
    host.onRequest('editor:maven:getRuntimeInfo', () => ({ runtimeInfo: null }));
    await app!.onStepUpdated(StepUpdateAction.Add, CatalogKind.Component, 'amqp');
    app!.sendNotifications('path', [{ severity: 'error', message: 'invalid' }]);
    await expect(app!.getRuntimeInfoFromMavenContext()).resolves.toBeUndefined();
    expect(step).toHaveBeenCalledExactlyOnceWith({
      action: StepUpdateAction.Add,
      stepType: CatalogKind.Component,
      stepName: 'amqp',
    });
    expect(notifications).toHaveBeenCalledExactlyOnceWith({
      path: 'path',
      notifications: [{ severity: 'error', message: 'invalid' }],
    });
  });

  it('treats unavailable Maven discovery as optional runtime information', async () => {
    await createApp();
    // A worker host has no Maven handler, so the bridge rejects immediately.
    await expect(app!.getRuntimeInfoFromMavenContext()).resolves.toBeUndefined();
  });

  it('keeps Maven discovery failures visible when the host supports the operation', async () => {
    await createApp();
    host.onRequest('editor:maven:getRuntimeInfo', () => {
      throw new BridgeError('IO_ERROR', 'Cannot read pom.xml');
    });
    await expect(app!.getRuntimeInfoFromMavenContext()).rejects.toMatchObject({ code: 'IO_ERROR' });
  });
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
