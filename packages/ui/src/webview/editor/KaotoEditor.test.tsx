import { render, screen } from '@testing-library/react';
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
      hostBus.request('editor:document:setContent', {
        reason: 'init',
        fileUri: 'file:///route.camel.yaml',
        content: '- route: {}',
        isDirty: false,
        readonly: false,
        saveAcknowledgements: true,
        nativeUndoRedo: true,
      }),
    ).resolves.toEqual(expect.objectContaining({ revision: expect.any(Number) }));

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
