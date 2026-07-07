import { render, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';

import { IMetadataApi, MetadataContext } from '../../providers';
import { onDeleteDataMapper } from '../DataMapper/on-delete-datamapper';
import {
  IInteractionType,
  IOnDeleteAddon,
  IRegisteredInteractionAddon,
} from './interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from './interactions/node-interaction-addon.provider';
import { RegisterNodeInteractionAddons } from './RegisterNodeInteractionAddons';

vi.mock('../DataMapper/on-delete-datamapper', async () => {
  const actual = await vi.importActual('../DataMapper/on-delete-datamapper');
  return {
    ...actual,
    onDeleteDataMapper: vi.fn().mockResolvedValue(undefined),
  };
});

describe('RegisterNodeInteractionAddons', () => {
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

    expect(onDeleteDataMapper).not.toHaveBeenCalled();
  });

  it('logs an error and does not throw when the DataMapper delete rejects', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (onDeleteDataMapper as Mock).mockRejectedValueOnce(new Error('delete boom'));
    const { registered } = renderWithSpy({} as IMetadataApi);

    expect(() => {
      getOnDeleteAddon(registered).callback({ vizNode: {} as never, modalAnswer: undefined });
    }).not.toThrow();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete DataMapper mapping:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });
});
