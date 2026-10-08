import { act, renderHook } from '@testing-library/react';
import hotkeys from 'hotkeys-js';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { DISABLED_NODE_INTERACTION, IVisualizationNode } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { EntityType } from '../../../../models/entities';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../../../../providers';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { createMockEntitiesContext } from '../../../../stubs';
import useDeleteHotkey from './delete-hotkey.hook';

/** `hotkeys-js` is mocked globally in vitest-mocks-setup.ts */
const mockHotkeys = vi.mocked(hotkeys);

// Helper to create a real visualization node with the given interactions
function makeNode({ canRemoveStep = false, canRemoveFlow = false } = {}) {
  const node = createVisualizationNode('test-node', {
    name: EntityType.Route,
    isPlaceholder: false,
    isGroup: canRemoveFlow,
    iconUrl: '',
    title: '',
    description: '',
  });
  vi.spyOn(node, 'getNodeInteraction').mockReturnValue({ ...DISABLED_NODE_INTERACTION, canRemoveStep, canRemoveFlow });
  vi.spyOn(node, 'removeChild').mockImplementation(() => {});
  vi.spyOn(node, 'getId').mockReturnValue('test-node');

  return node;
}

describe('useDeleteHotkey', () => {
  let camelResource: CamelRouteResource;
  let entitiesContext: EntitiesContextResult;
  let clearSelected: Mock;
  let actionConfirmation: Mock;
  let removeEntitySpy: Mock<CamelRouteResource['removeEntity']>;

  beforeEach(async () => {
    camelResource = new CamelRouteResource();
    entitiesContext = await createMockEntitiesContext(camelResource);
    removeEntitySpy = vi.spyOn(camelResource, 'removeEntity');
    clearSelected = vi.fn();
    actionConfirmation = vi.fn().mockResolvedValue(ACTION_ID_CONFIRM);

    mockHotkeys.mockReset();
    mockHotkeys.unbind.mockReset();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={entitiesContext}>
      <ActionConfirmationModalContext.Provider value={{ actionConfirmation }}>
        {children}
      </ActionConfirmationModalContext.Provider>
    </EntitiesContext.Provider>
  );

  // Small helper for tests
  function setupHotkey(node?: IVisualizationNode) {
    let capturedHandler: ((event: KeyboardEvent) => void) | undefined;
    mockHotkeys.mockImplementation((_keys: string, ...args: unknown[]) => {
      capturedHandler = args.find((arg): arg is (event: KeyboardEvent) => void => typeof arg === 'function');
    });

    renderHook(
      () => {
        useDeleteHotkey(node, clearSelected);
      },
      { wrapper },
    );
    return capturedHandler!;
  }

  it('should bind and unbind hotkeys on mount/unmount', () => {
    const { unmount } = renderHook(
      () => {
        useDeleteHotkey(undefined, clearSelected);
      },
      { wrapper },
    );

    expect(mockHotkeys).toHaveBeenCalledWith('Delete, backspace', expect.any(Function));

    unmount();
    expect(mockHotkeys.unbind).toHaveBeenCalledWith('Delete, backspace', expect.any(Function));
  });

  it('should do nothing if no node selected', async () => {
    const handler = setupHotkey(undefined);

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    await act(async () => {
      handler(event);
    });

    expect(entitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    expect(actionConfirmation).not.toHaveBeenCalled();
    expect(clearSelected).not.toHaveBeenCalled();
  });

  it('should call onDeleteStep and clearSelected when canRemoveStep=true', async () => {
    const node = makeNode({ canRemoveStep: true });
    const handler = setupHotkey(node);

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    await act(async () => {
      handler(event);
    });

    expect(node.removeChild).toHaveBeenCalled();
    expect(removeEntitySpy).not.toHaveBeenCalled();
    expect(clearSelected).toHaveBeenCalled();
  });

  it('should call onDeleteGroup and clearSelected when canRemoveFlow=true', async () => {
    const node = makeNode({ canRemoveFlow: true });
    const handler = setupHotkey(node);

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    await act(async () => {
      handler(event);
    });

    expect(node.removeChild).not.toHaveBeenCalled();
    expect(actionConfirmation).toHaveBeenCalled();
    expect(removeEntitySpy).toHaveBeenCalledWith(['test-node']);
    expect(clearSelected).toHaveBeenCalled();
  });

  it('should do nothing when node cannot be removed', async () => {
    const node = makeNode({ canRemoveStep: false, canRemoveFlow: false });
    const handler = setupHotkey(node);

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    await act(async () => {
      handler(event);
    });

    expect(node.removeChild).not.toHaveBeenCalled();
    expect(removeEntitySpy).not.toHaveBeenCalled();
    expect(clearSelected).not.toHaveBeenCalled();
  });

  it('should call preventDefault on event', async () => {
    const handler = setupHotkey(makeNode({ canRemoveStep: true }));

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    await act(async () => {
      handler(event);
    });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('logs the error and does not clear the selection when deletion fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const node = makeNode({ canRemoveStep: true });
    vi.mocked(node.removeChild).mockImplementation(() => {
      throw new Error('delete boom');
    });
    const handler = setupHotkey(node);

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    await act(async () => {
      handler(event);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete node:', expect.any(Error));
    expect(clearSelected).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
