import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPostMessageBridge } from '../host-bridge/bridge';
import { SettingsSnapshot } from '../host-bridge/contracts';
import { createEventBus } from '../host-bridge/event-bus';
import { createMemoryTransports } from '../host-bridge/transports/memory';
import {
  CanvasLayoutDirection,
  ColorScheme,
  NodeLabelType,
  NodeToolbarTrigger,
} from '../models/settings/settings.model';
import { serveBundledCatalog } from '../stubs/serve-bundled-catalog';
import { startKaotoWebview } from './webview-entry';

const settings: SettingsSnapshot = {
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

/** A host that answers the settings request and sends a route once the editor is ready */
const connectHost = () => {
  const { host, editor } = createMemoryTransports();
  const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
  hostBus.onRequest('editor:settings:get', () => settings);
  hostBus.on('editor:ready', () => {
    void hostBus.request('host:document:setContent', {
      reason: 'init',
      fileUri: 'file:///route.camel.yaml',
      content: '- route: {}',
      readonly: false,
    });
  });
  const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
  void hostBridge.connect();

  return { editor, hostBridge };
};

describe('startKaotoWebview', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="kaoto-editor"></div>';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows the error and a Retry button when the transport cannot be created', async () => {
    const createTransport = vi.fn(() => {
      throw new Error('No Kaoto host');
    });

    startKaotoWebview(createTransport);

    expect(await screen.findByRole('alert')).toHaveTextContent('No Kaoto host');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it('asks the host for a fresh transport when Retry is clicked', async () => {
    const createTransport = vi.fn(() => {
      throw new Error('No Kaoto host');
    });
    startKaotoWebview(createTransport);

    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(createTransport).toHaveBeenCalledTimes(2);
    });
  });

  it('renders the pages of the editor router once the host sent the document', async () => {
    await serveBundledCatalog();
    const { editor, hostBridge } = connectHost();

    startKaotoWebview(() => editor);

    expect(await screen.findByRole('tab', { name: /Design/ })).toBeInTheDocument();

    globalThis.dispatchEvent(new Event('pagehide'));
    hostBridge.dispose();
  });

  it('releases the router when the page goes away', async () => {
    await serveBundledCatalog();
    const { editor, hostBridge } = connectHost();
    startKaotoWebview(() => editor);
    await screen.findByRole('tab', { name: /Design/ });
    // A hash router stops listening to the history of the window when it is released
    const removeEventListener = vi.spyOn(globalThis, 'removeEventListener');

    globalThis.dispatchEvent(new Event('pagehide'));

    expect(removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    hostBridge.dispose();
  });
});
