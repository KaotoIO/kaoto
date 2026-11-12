import { Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { render, renderHook, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, StrictMode, useContext, useMemo } from 'react';
import type { MockInstance } from 'vitest';

import { errorMessage } from '../../hooks/useEntityContext/useEntityContext';
import { CatalogKind } from '../../models/catalog-kind';
import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { IMetadataApi, MetadataContext } from '../../providers';
import { EntitiesContext, EntitiesContextResult } from '../../providers/entities.provider';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import {
  IInteractionType,
  IOnDeleteAddon,
  IOnUpdateAddon,
  IRegisteredInteractionAddon,
} from './interactions/node-interaction-addon.model';
import {
  NodeInteractionAddonContext,
  NodeInteractionAddonProvider,
} from './interactions/node-interaction-addon.provider';
import { RegisterNodeInteractionAddons } from './RegisterNodeInteractionAddons';

describe('RegisterNodeInteractionAddons', () => {
  let getDataMapperMetadataIdSpy: MockInstance<typeof DataMapperStepService.getDataMapperMetadataId>;
  let deleteXsltFileSpy: MockInstance<typeof DataMapperMetadataService.deleteXsltFile>;
  let deleteMetadataSpy: MockInstance<typeof DataMapperMetadataService.deleteMetadata>;

  const metadataApi: IMetadataApi = {
    getMetadata: vi.fn(),
    setMetadata: vi.fn(),
    getResourceContent: vi.fn(),
    isResourceExist: vi.fn(),
    saveResourceContent: vi.fn(),
    deleteResource: vi.fn(),
    askUserForFileSelection: vi.fn(),
    getSuggestions: vi.fn(),
    shouldSaveSchema: false,
    onStepUpdated: vi.fn(),
  };

  beforeEach(() => {
    getDataMapperMetadataIdSpy = vi
      .spyOn(DataMapperStepService, 'getDataMapperMetadataId')
      .mockReturnValue('test-metadata-id');
    deleteXsltFileSpy = vi.spyOn(DataMapperMetadataService, 'deleteXsltFile').mockResolvedValue(undefined);
    deleteMetadataSpy = vi.spyOn(DataMapperMetadataService, 'deleteMetadata').mockResolvedValue(undefined);
  });

  const createEntitiesContext = (updateEntitiesFromCamelResource = vi.fn()) =>
    ({ updateEntitiesFromCamelResource }) as unknown as EntitiesContextResult;

  const renderWithSpy = (
    metadataApi: IMetadataApi | undefined = undefined,
    entitiesContext: EntitiesContextResult = createEntitiesContext(),
  ) => {
    const registered: IRegisteredInteractionAddon[] = [];
    const registerInteractionAddon = vi.fn((addon: IRegisteredInteractionAddon) => {
      registered.push(addon);
      return () => {
        registered.splice(registered.indexOf(addon), 1);
      };
    });

    const controller = new Visualization();

    const Wrapper: FunctionComponent<PropsWithChildren<{ entities: EntitiesContextResult }>> = ({
      entities,
      children,
    }) => {
      const addonContext = useMemo(() => ({ registerInteractionAddon, getRegisteredInteractionAddons: () => [] }), []);

      return (
        <EntitiesContext.Provider value={entities}>
          <MetadataContext.Provider value={metadataApi}>
            <NodeInteractionAddonContext.Provider value={addonContext}>
              <VisualizationProvider controller={controller}>
                <RegisterNodeInteractionAddons>{children}</RegisterNodeInteractionAddons>
              </VisualizationProvider>
            </NodeInteractionAddonContext.Provider>
          </MetadataContext.Provider>
        </EntitiesContext.Provider>
      );
    };

    const result = render(
      <Wrapper entities={entitiesContext}>
        <p>child content</p>
      </Wrapper>,
    );

    const rerenderWithEntities = (entities: EntitiesContextResult) => {
      result.rerender(
        <Wrapper entities={entities}>
          <p>child content</p>
        </Wrapper>,
      );
    };

    return { registered, result, rerenderWithEntities, registerInteractionAddon, controller };
  };

  const getOnDeleteAddon = (registered: IRegisteredInteractionAddon[]) =>
    registered.find((addon) => addon.type === IInteractionType.ON_DELETE) as IOnDeleteAddon;

  it('keeps another caller’s registration when the same addon is registered twice', () => {
    const { result } = renderHook(() => useContext(NodeInteractionAddonContext), {
      wrapper: NodeInteractionAddonProvider,
    });
    const addon: IOnDeleteAddon = {
      type: IInteractionType.ON_DELETE,
      activationFn: () => true,
      callback: () => {},
    };
    const firstCleanup = result.current.registerInteractionAddon(addon);
    const secondCleanup = result.current.registerInteractionAddon(addon);
    expect(result.current.getRegisteredInteractionAddons(IInteractionType.ON_DELETE)).toEqual([addon, addon]);

    secondCleanup?.();
    expect(result.current.getRegisteredInteractionAddons(IInteractionType.ON_DELETE)).toEqual([addon]);
    secondCleanup?.();
    expect(result.current.getRegisteredInteractionAddons(IInteractionType.ON_DELETE)).toEqual([addon]);
    firstCleanup?.();
    expect(result.current.getRegisteredInteractionAddons(IInteractionType.ON_DELETE)).toEqual([]);
  });

  it('registers each addon once through StrictMode and releases it on unmount', () => {
    const { result, rerender, unmount } = renderHook(() => useContext(NodeInteractionAddonContext), {
      wrapper: ({ children }) => (
        <StrictMode>
          <EntitiesContext.Provider value={createEntitiesContext()}>
            <NodeInteractionAddonProvider>
              <RegisterNodeInteractionAddons>{children}</RegisterNodeInteractionAddons>
            </NodeInteractionAddonProvider>
          </EntitiesContext.Provider>
        </StrictMode>
      ),
    });
    const getAddons = result.current.getRegisteredInteractionAddons;
    for (const type of Object.values(IInteractionType)) {
      expect(getAddons(type)).toHaveLength(1);
    }
    rerender();
    expect(getAddons(IInteractionType.ON_DELETE)).toHaveLength(1);
    unmount();
    expect(getAddons(IInteractionType.ON_DELETE)).toHaveLength(0);
  });

  it('registers all the interaction addon types', () => {
    const { registered } = renderWithSpy();

    expect(registered.map((addon) => addon.type)).toEqual([
      IInteractionType.ON_DELETE,
      IInteractionType.ON_COPY,
      IInteractionType.ON_DUPLICATE,
      IInteractionType.ON_PASTE,
      IInteractionType.ON_UPDATE,
    ]);
  });

  it('requires the entities context', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<RegisterNodeInteractionAddons />)).toThrow(errorMessage);

    consoleErrorSpy.mockRestore();
  });

  describe('Citrus ON_UPDATE addon', () => {
    const getOnUpdateAddon = (registered: IRegisteredInteractionAddon[]) =>
      registered.find((addon) => addon.type === IInteractionType.ON_UPDATE) as IOnUpdateAddon;

    const createWaitForVizNode = (isGroup: boolean) =>
      ({
        getId: () => 'test-1',
        data: { path: 'actions.0.waitFor', definition: { action: {} }, isGroup },
      }) as unknown as IVisualizationNode;

    it('is only active for waitFor test actions', () => {
      const addon = getOnUpdateAddon(renderWithSpy().registered);

      expect(
        addon.activationFn({
          data: { primaryNodeId: { name: 'waitFor', catalogKind: CatalogKind.TestAction } },
        } as unknown as IVisualizationNode),
      ).toBe(true);
      expect(
        addon.activationFn({
          data: { primaryNodeId: { name: 'print', catalogKind: CatalogKind.TestAction } },
        } as unknown as IVisualizationNode),
      ).toBe(false);
      expect(
        addon.activationFn({
          data: { primaryNodeId: { name: 'waitFor', catalogKind: CatalogKind.Processor } },
        } as unknown as IVisualizationNode),
      ).toBe(false);
    });

    it('rebuilds the entities when the waitFor shape no longer matches the rendered node', () => {
      const updateEntitiesFromCamelResource = vi.fn();
      const { registered } = renderWithSpy(undefined, createEntitiesContext(updateEntitiesFromCamelResource));
      const addon = getOnUpdateAddon(registered);

      addon.callback({ vizNode: createWaitForVizNode(true) });
      expect(updateEntitiesFromCamelResource).not.toHaveBeenCalled();

      addon.callback({ vizNode: createWaitForVizNode(false) });
      expect(updateEntitiesFromCamelResource).toHaveBeenCalledTimes(1);
    });

    it('requests the selection of the updated node before rebuilding, so the form stays open', () => {
      const updateEntitiesFromCamelResource = vi.fn(() => {
        pendingSelectionOnRebuild = controller.getState<{ pendingNodeSelection?: unknown }>().pendingNodeSelection;
      });
      let pendingSelectionOnRebuild: unknown;
      const { registered, controller } = renderWithSpy(
        undefined,
        createEntitiesContext(updateEntitiesFromCamelResource),
      );
      const addon = getOnUpdateAddon(registered);

      addon.callback({ vizNode: createWaitForVizNode(true) });
      expect(controller.getState<{ pendingNodeSelection?: unknown }>().pendingNodeSelection).toBeUndefined();

      addon.callback({ vizNode: createWaitForVizNode(false) });
      expect(pendingSelectionOnRebuild).toEqual({ entityId: 'test-1', path: 'actions.0.waitFor' });
    });

    it('rebuilds using the latest entities context after it changes', () => {
      const initialUpdate = vi.fn();
      const latestUpdate = vi.fn();
      const { registered, rerenderWithEntities } = renderWithSpy(undefined, createEntitiesContext(initialUpdate));

      rerenderWithEntities(createEntitiesContext(latestUpdate));
      /** The previous registrations are released, so only the latest addons remain */
      expect(registered).toHaveLength(5);
      getOnUpdateAddon(registered).callback({ vizNode: createWaitForVizNode(false) });

      expect(initialUpdate).not.toHaveBeenCalled();
      expect(latestUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it('renders its children', () => {
    const { result } = renderWithSpy();

    expect(result.getByText('child content')).toBeInTheDocument();
  });

  it('does not invoke the DataMapper delete when no metadata API is available', () => {
    const { registered } = renderWithSpy(undefined);

    getOnDeleteAddon(registered).callback({ vizNode: {} as never, modalAnswer: undefined });

    expect(getDataMapperMetadataIdSpy).not.toHaveBeenCalled();
    expect(deleteXsltFileSpy).not.toHaveBeenCalled();
    expect(deleteMetadataSpy).not.toHaveBeenCalled();
  });

  it('logs an error and does not throw when the DataMapper delete rejects', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    deleteMetadataSpy.mockRejectedValueOnce(new Error('delete boom'));
    const { registered } = renderWithSpy(metadataApi);

    expect(() => {
      getOnDeleteAddon(registered).callback({ vizNode: {} as never, modalAnswer: undefined });
    }).not.toThrow();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete DataMapper mapping:', expect.any(Error));
    });
    expect(deleteMetadataSpy).toHaveBeenCalledWith(metadataApi, 'test-metadata-id');

    consoleErrorSpy.mockRestore();
  });
});
