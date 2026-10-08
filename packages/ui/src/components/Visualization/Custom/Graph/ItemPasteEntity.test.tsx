import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactElement } from 'react';
import type { Mock, MockInstance } from 'vitest';

import { IClipboardContent } from '../../../../models/visualization/clipboard';
import { ClipboardService } from '../../../../services/visualization/clipboard.service';
import { TestProvidersWrapper } from '../../../../stubs';
import { ItemPasteEntity } from './ItemPasteEntity';

describe('ItemPasteEntity', () => {
  /** A route can be pasted into the Camel Route resource rendered by TestProvidersWrapper */
  const routeContent: IClipboardContent = { name: 'route', definition: { from: { uri: 'timer:clock', steps: [] } } };
  /** A pipe can't be pasted into a Camel Route resource */
  const pipeContent: IClipboardContent = { name: 'pipe', definition: {} };

  /** jsdom has no Permissions API: install one granting the clipboard access, and restore the original afterwards */
  let originalPermissions: PropertyDescriptor | undefined;
  let pasteSpy: MockInstance<typeof ClipboardService.paste>;
  let updateEntitiesFromCamelResourceSpy: Mock;

  beforeEach(() => {
    originalPermissions = Object.getOwnPropertyDescriptor(navigator, 'permissions');
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn().mockResolvedValue({ state: 'granted' }) },
    });
    pasteSpy = vi.spyOn(ClipboardService, 'paste');
  });

  afterEach(() => {
    if (originalPermissions) {
      Object.defineProperty(navigator, 'permissions', originalPermissions);
    } else {
      Reflect.deleteProperty(navigator, 'permissions');
    }
  });

  /**
   * Renders the item with the real `usePasteEntity` hook, with the given clipboard content,
   * and waits until the clipboard compatibility check settles
   */
  const renderWithClipboard = async (ui: ReactElement, clipboardContent: IClipboardContent) => {
    pasteSpy.mockResolvedValue(clipboardContent);
    const { Provider, updateEntitiesFromCamelResourceSpy: updateSpy } = await TestProvidersWrapper();
    updateEntitiesFromCamelResourceSpy = updateSpy;

    const result = render(ui, { wrapper: Provider });
    await waitFor(() => {
      expect(pasteSpy).toHaveBeenCalled();
    });
    await act(async () => {
      await pasteSpy.mock.results[0].value;
    });

    return result;
  };

  it('renders the paste menu item with icon and text', async () => {
    await renderWithClipboard(<ItemPasteEntity data-testid="paste-item" />, routeContent);

    expect(screen.getByTestId('paste-item')).toBeInTheDocument();
    expect(screen.getByText('Paste')).toBeInTheDocument();
  });

  it('is enabled when isCompatible is true', async () => {
    await renderWithClipboard(<ItemPasteEntity data-testid="paste-item" />, routeContent);

    const menuItem = screen.getByRole('menuitem');
    expect(menuItem).not.toHaveAttribute('disabled');
  });

  it('is disabled when isCompatible is false', async () => {
    await renderWithClipboard(<ItemPasteEntity data-testid="paste-item" />, pipeContent);

    const menuItem = screen.getByRole('menuitem');
    expect(menuItem).toHaveAttribute('disabled');
  });

  it('calls onPasteEntity when clicked and enabled', async () => {
    await renderWithClipboard(<ItemPasteEntity data-testid="paste-item" />, routeContent);

    const menuItem = screen.getByRole('menuitem');
    fireEvent.click(menuItem);

    /* The real `usePasteEntity` adds the pasted route and refreshes the entities */
    await waitFor(() => {
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onPasteEntity when clicked and disabled', async () => {
    await renderWithClipboard(<ItemPasteEntity data-testid="paste-item" />, pipeContent);

    const menuItem = screen.getByTestId('paste-item');
    fireEvent.click(menuItem);

    expect(updateEntitiesFromCamelResourceSpy).not.toHaveBeenCalled();
  });

  it('renders with custom data-testid', async () => {
    await renderWithClipboard(<ItemPasteEntity data-testid="custom-test-id" />, routeContent);

    expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
  });

  it('renders with icon testid from mock', async () => {
    const { container } = await renderWithClipboard(<ItemPasteEntity />, routeContent);

    expect(screen.getByText('Paste')).toBeInTheDocument();
    // Icon mock always provides a testid for the icon itself
    expect(container.querySelector('[data-testid="paste-icon"]')).toBeInTheDocument();
  });

  it('maintains correct structure with icon and text', async () => {
    await renderWithClipboard(<ItemPasteEntity data-testid="paste-item" />, routeContent);

    const menuItem = screen.getByTestId('paste-item');
    const icon = menuItem.querySelector('svg');
    const text = screen.getByText('Paste');

    expect(icon).toBeInTheDocument();
    expect(text).toBeInTheDocument();
    expect(text).toHaveClass('pf-v6-u-m-sm');
  });
});
