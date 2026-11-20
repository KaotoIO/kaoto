import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createPostMessageBridge } from '../../host-bridge/bridge';
import { BridgeError, SettingsSnapshot } from '../../host-bridge/contracts';
import { createEventBus } from '../../host-bridge/event-bus';
import { createMemoryTransports } from '../../host-bridge/transports/memory';
import {
  CanvasLayoutDirection,
  ColorScheme,
  NodeLabelType,
  NodeToolbarTrigger,
} from '../../models/settings/settings.model';
import { isDarkModeEnabled } from '../../utils/color-scheme';
import { KaotoEditor, type KaotoEditorInit } from './KaotoEditor';

const defaultInit: KaotoEditorInit = {
  fileExtension: 'camel.yaml',
  resourcesPathPrefix: '',
  isReadOnly: false,
};

const defaultSettings: SettingsSnapshot = {
  settingsVersion: 0,
  settings: {
    catalogUrl: '',
    runtimeCatalogName: '',
    testingCatalogName: '',
    nodeLabel: NodeLabelType.Description,
    nodeToolbarTrigger: NodeToolbarTrigger.onHover,
    colorScheme: ColorScheme.Auto,
    rest: { apicurioRegistryUrl: '', customMediaTypes: [] },
    canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
  },
};

describe('KaotoEditor', () => {
  it('shows loading state before document is initialized', () => {
    const bus = createEventBus({ role: 'editor', onError: vi.fn() });
    render(<KaotoEditor bus={bus} initialSettings={defaultSettings} init={defaultInit} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('mounts under React Strict Mode and accepts the host content', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);

    render(
      <StrictMode>
        <KaotoEditor bus={editorBus} initialSettings={defaultSettings} init={defaultInit} />
      </StrictMode>,
    );

    await expect(
      hostBus.request('host:document:setContent', {
        reason: 'init',
        fileUri: 'file:///route.camel.yaml',
        content: '- route: {}',
        readonly: false,
      }),
    ).resolves.toEqual(expect.objectContaining({ revision: expect.any(Number) }));

    hostBridge.dispose();
    editorBridge.dispose();
  });

  it('accepts the host content after the editor re-renders', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);

    const { rerender } = render(<KaotoEditor bus={editorBus} initialSettings={defaultSettings} init={defaultInit} />);
    // A re-render must not detach the editor handle the document binding captured on the first render
    rerender(<KaotoEditor bus={editorBus} initialSettings={defaultSettings} init={{ ...defaultInit }} />);

    await expect(
      hostBus.request('host:document:setContent', {
        reason: 'init',
        fileUri: 'file:///route.camel.yaml',
        content: '- route: {}',
        readonly: false,
      }),
    ).resolves.toEqual(expect.objectContaining({ revision: expect.any(Number) }));

    hostBridge.dispose();
    editorBridge.dispose();
  });

  it('asks the host for the document and renders past the loading state once it arrives', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);
    // The host only sends the document after `editor:ready`
    hostBus.on('editor:ready', () => {
      void hostBus.request('host:document:setContent', {
        reason: 'init',
        fileUri: 'file:///route.camel.yaml',
        content: '- route: {}',
        readonly: false,
      });
    });

    render(<KaotoEditor bus={editorBus} initialSettings={defaultSettings} init={defaultInit} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-kaoto-resource')).not.toBeInTheDocument();
    });

    hostBridge.dispose();
    editorBridge.dispose();
  });

  it('suspends the document and offers Retry when the host connection is lost', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);
    let disconnect: ((error: Error) => void) | undefined;
    const init: KaotoEditorInit = {
      ...defaultInit,
      onDisconnect: (listener) => {
        disconnect = listener;
        return () => {
          disconnect = undefined;
        };
      },
    };

    render(<KaotoEditor bus={editorBus} initialSettings={defaultSettings} init={init} />);
    await hostBus.request('host:document:setContent', {
      reason: 'init',
      fileUri: 'file:///route.camel.yaml',
      content: '- route: {}',
      readonly: false,
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    disconnect?.(new BridgeError('IO_ERROR', 'The peer rejected message delivery'));

    expect(await screen.findByRole('alert')).toHaveTextContent('The peer rejected message delivery');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    hostBridge.dispose();
    editorBridge.dispose();
  });

  it('applies the color scheme from the host settings and follows its updates', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);
    const withScheme = (settingsVersion: number, colorScheme: ColorScheme): SettingsSnapshot => ({
      settingsVersion,
      settings: { ...defaultSettings.settings, colorScheme },
    });
    render(<KaotoEditor bus={editorBus} initialSettings={withScheme(0, ColorScheme.Dark)} init={defaultInit} />);
    await waitFor(() => {
      expect(isDarkModeEnabled()).toBe(true);
    });

    hostBus.emit('host:settings:updated', withScheme(1, ColorScheme.Light));
    await waitFor(() => {
      expect(isDarkModeEnabled()).toBe(false);
    });

    // A stale snapshot does not undo a newer one
    hostBus.emit('host:settings:updated', withScheme(1, ColorScheme.Dark));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(isDarkModeEnabled()).toBe(false);

    hostBridge.dispose();
    editorBridge.dispose();
  });

  it('disposes the bus on unmount', async () => {
    const bus = createEventBus({ role: 'editor', onError: vi.fn() });
    const disposeSpy = vi.spyOn(bus, 'dispose');
    const { unmount } = render(<KaotoEditor bus={bus} initialSettings={defaultSettings} init={defaultInit} />);
    unmount();
    // queueMicrotask defers the actual dispose; flush the microtask queue
    await Promise.resolve();
    expect(disposeSpy).toHaveBeenCalled();
  });

  it('triggers onRetry callback when Retry button is clicked', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);

    const onRetry = vi.fn();
    let disconnect: ((error: Error) => void) | undefined;
    const init: KaotoEditorInit = {
      ...defaultInit,
      onRetry,
      onDisconnect: (listener) => {
        disconnect = listener;
        return () => {};
      },
    };

    render(<KaotoEditor bus={editorBus} initialSettings={defaultSettings} init={init} />);
    await hostBus.request('host:document:setContent', {
      reason: 'init',
      fileUri: 'file:///route.camel.yaml',
      content: '- route: {}',
      readonly: false,
    });

    disconnect?.(new BridgeError('IO_ERROR', 'The peer rejected message delivery'));

    const retryButton = await screen.findByRole('button', { name: 'Retry' });
    retryButton.click();

    expect(onRetry).toHaveBeenCalledOnce();

    hostBridge.dispose();
    editorBridge.dispose();
  });

  it('sets inert on canvas when the host provides unparseable YAML', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);

    const { container } = render(<KaotoEditor bus={editorBus} initialSettings={defaultSettings} init={defaultInit} />);
    await hostBus.request('host:document:setContent', {
      reason: 'init',
      fileUri: 'file:///route.camel.yaml',
      content: '- route:\n    steps: [ unclosed\n',
      readonly: false,
    });

    await waitFor(() => {
      const inertDiv = container.querySelector('[inert]');
      expect(inertDiv).toBeInTheDocument();
    });

    hostBridge.dispose();
    editorBridge.dispose();
  });

  it('announces the parse error from outside the inert canvas, and clears it once the source parses', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);

    render(<KaotoEditor bus={editorBus} initialSettings={defaultSettings} init={defaultInit} />);
    await hostBus.request('host:document:setContent', {
      reason: 'init',
      fileUri: 'file:///route.camel.yaml',
      content: '- route:\n    steps: [ unclosed\n',
      readonly: false,
    });

    /* The broken-file state on the canvas is a status as well, but an inert one */
    const findParseStatus = () => screen.getAllByRole('status').find((status) => status.closest('[inert]') === null);
    await waitFor(() => {
      expect(findParseStatus()).toHaveTextContent('This file could not be parsed.');
    });

    await hostBus.request('host:document:setContent', {
      reason: 'hostUpdate',
      fileUri: 'file:///route.camel.yaml',
      content: '- route:\n    from:\n      uri: timer:tick\n',
    });

    await waitFor(() => {
      expect(findParseStatus()).toHaveTextContent('');
    });

    hostBridge.dispose();
    editorBridge.dispose();
  });

  it('falls back to window.location.reload when onRetry is not provided', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);

    const reloadMock = vi.fn();
    const originalLocation = window.location;
    // jsdom cannot reload; the editor's router still reads the URL of the page, so the stand-in keeps it
    const { hash, href, pathname, search } = originalLocation;
    Object.defineProperty(window, 'location', {
      value: { hash, href, pathname, search, reload: reloadMock },
      writable: true,
    });
    onTestFinished(() => {
      Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    });

    let disconnect: ((error: Error) => void) | undefined;
    const init: KaotoEditorInit = {
      ...defaultInit,
      onDisconnect: (listener) => {
        disconnect = listener;
        return () => {};
      },
    };

    render(<KaotoEditor bus={editorBus} initialSettings={defaultSettings} init={init} />);
    await hostBus.request('host:document:setContent', {
      reason: 'init',
      fileUri: 'file:///route.camel.yaml',
      content: '- route: {}',
      readonly: false,
    });

    disconnect?.(new BridgeError('IO_ERROR', 'The peer rejected message delivery'));

    const retryButton = await screen.findByRole('button', { name: 'Retry' });
    retryButton.click();

    expect(reloadMock).toHaveBeenCalledOnce();

    hostBridge.dispose();
    editorBridge.dispose();
  });

  it('renders the catalog error empty state and permits reload with default catalog', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);

    render(<KaotoEditor bus={editorBus} initialSettings={defaultSettings} init={defaultInit} />);
    await hostBus.request('host:document:setContent', {
      reason: 'init',
      fileUri: 'file:///route.camel.yaml',
      content: '- route: {}',
      readonly: false,
    });

    const reloadButton = await screen.findByRole('button', { name: 'Reload with default Catalog' });
    expect(reloadButton).toBeInTheDocument();
    reloadButton.click();

    hostBridge.dispose();
    editorBridge.dispose();
  });
});
