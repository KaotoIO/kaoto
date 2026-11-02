import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createPostMessageBridge } from '../../host-bridge/bridge';
import { SettingsSnapshot } from '../../host-bridge/contracts';
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
});
