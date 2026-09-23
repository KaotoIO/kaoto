import { SuggestionRegistryProvider } from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AddMethodModal } from './AddMethodModal';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<SuggestionRegistryProvider>{component}</SuggestionRegistryProvider>);
};

describe('AddMethodModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAddMethod = vi.fn();

  // Helper to render modal and return common test utilities
  const setupModal = async (options: { expandFields?: boolean } = {}) => {
    const { expandFields = false } = options;

    renderWithProviders(<AddMethodModal open onClose={mockOnClose} onAddMethod={mockOnAddMethod} />);

    const formPageObject = new KaotoFormPageObject(screen, act);

    if (expandFields) {
      await formPageObject.showAllFields();
    }

    return {
      formPageObject,
      findMethodField: () => screen.findByPlaceholderText('get'),
      findCancelButton: () => screen.findByRole('button', { name: 'Cancel' }),
      findAddButton: () => screen.findByRole('button', { name: 'Add' }),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with correct title and structure', async () => {
    renderWithProviders(<AddMethodModal open onClose={mockOnClose} onAddMethod={mockOnAddMethod} />);

    expect(await screen.findByText('Add REST Method')).toBeInTheDocument();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('should initialize form with default method "get"', async () => {
    const { findMethodField } = await setupModal();

    // HTTP Method is rendered as a typeahead field with placeholder
    const methodField = await findMethodField();
    expect(methodField).toBeInTheDocument();
    expect(methodField).toHaveValue('get');
  });

  it('should close modal when Cancel button is clicked without calling onAddMethod', async () => {
    const { findCancelButton } = await setupModal();

    fireEvent.click(await findCancelButton());

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnAddMethod).not.toHaveBeenCalled();
  });

  it('should call onAddMethod with correct form data when Add button is clicked with valid data', async () => {
    const { formPageObject, findAddButton } = await setupModal();

    await formPageObject.inputText('Path', '/api/users');

    fireEvent.click(await findAddButton());

    await waitFor(() => {
      expect(mockOnAddMethod).toHaveBeenCalledTimes(1);
      expect(mockOnAddMethod).toHaveBeenCalledWith({
        method: 'get',
        path: '/api/users',
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
