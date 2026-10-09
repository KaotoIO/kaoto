import { render, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, useContext } from 'react';
import type { MockInstance } from 'vitest';

import { IMetadataApi, MetadataContext } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import {
  IInteractionType,
  IOnDeleteAddon,
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

  const renderWithSpy = (metadataApi: IMetadataApi | undefined = undefined) => {
    const registered: IRegisteredInteractionAddon[] = [];
    const registerInteractionAddon = vi.fn((addon: IRegisteredInteractionAddon) => {
      registered.push(addon);
    });

    const result = render(
      <MetadataContext.Provider value={metadataApi}>
        <NodeInteractionAddonContext.Provider
          value={{ registerInteractionAddon, getRegisteredInteractionAddons: () => [] }}
        >
          <RegisterNodeInteractionAddons>
            <p>child content</p>
          </RegisterNodeInteractionAddons>
        </NodeInteractionAddonContext.Provider>
      </MetadataContext.Provider>,
    );

    return { registered, result };
  };

  const getOnDeleteAddon = (registered: IRegisteredInteractionAddon[]) =>
    registered.find((addon) => addon.type === IInteractionType.ON_DELETE) as IOnDeleteAddon;

  it('registers each addon once through StrictMode and releases it on unmount', () => {
    const { result, rerender, unmount } = renderHook(() => useContext(NodeInteractionAddonContext), {
      wrapper: ({ children }) => (
        <StrictMode>
          <NodeInteractionAddonProvider>
            <RegisterNodeInteractionAddons>{children}</RegisterNodeInteractionAddons>
          </NodeInteractionAddonProvider>
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

  it('registers all four interaction addon types', () => {
    const { registered } = renderWithSpy();

    expect(registered.map((addon) => addon.type)).toEqual([
      IInteractionType.ON_DELETE,
      IInteractionType.ON_COPY,
      IInteractionType.ON_DUPLICATE,
      IInteractionType.ON_PASTE,
    ]);
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
