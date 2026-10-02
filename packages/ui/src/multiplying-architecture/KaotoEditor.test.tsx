import { render, screen } from '@testing-library/react';
import {
  CanvasLayoutDirection,
  ColorScheme,
  createEventBus,
  NodeLabelType,
  NodeToolbarTrigger,
  type SettingsSnapshot,
} from '@kaoto/editor-api';
import { KaotoEditor, type KaotoEditorInit } from './KaotoEditor';
import { describe, it, expect, vi } from 'vitest';

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
    render(
      <KaotoEditor bus={bus} initialSettings={defaultSettings} init={defaultInit} />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('disposes the bus on unmount', async () => {
    const bus = createEventBus({ role: 'editor', onError: vi.fn() });
    const disposeSpy = vi.spyOn(bus, 'dispose');
    const { unmount } = render(
      <KaotoEditor bus={bus} initialSettings={defaultSettings} init={defaultInit} />,
    );
    unmount();
    // queueMicrotask defers the actual dispose; flush the microtask queue
    await Promise.resolve();
    expect(disposeSpy).toHaveBeenCalled();
  });
});
