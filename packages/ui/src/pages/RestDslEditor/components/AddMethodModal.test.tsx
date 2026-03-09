import { SuggestionRegistryProvider } from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AddMethodModal } from './AddMethodModal';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<SuggestionRegistryProvider>{component}</SuggestionRegistryProvider>);
};

describe('AddMethodModal', () => {
  const mockOnClose = jest.fn();
  const mockOnAddMethod = jest.fn();

  // Helper to render modal and return common test utilities
  const setupModal = async (options: { expandFields?: boolean } = {}) => {
    const { expandFields = false } = options;

    renderWithProviders(<AddMethodModal onClose={mockOnClose} onAddMethod={mockOnAddMethod} />);

    const formPageObject = new KaotoFormPageObject(screen, act);

    if (expandFields) {
      await formPageObject.showAllFields();
    }

    return {
      formPageObject,
      getMethodField: () => screen.getByPlaceholderText('get'),
      getPathField: () => formPageObject.getFieldByDisplayName('Path') as HTMLInputElement,
      getCancelButton: () => screen.getByRole('button', { name: 'Cancel' }),
      getAddButton: () => screen.getByRole('button', { name: 'Add' }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with correct title and structure', () => {
    renderWithProviders(<AddMethodModal onClose={mockOnClose} onAddMethod={mockOnAddMethod} />);

    expect(screen.getByText('Add REST Method')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('should initialize form with default method "get"', async () => {
    const { getMethodField } = await setupModal({ expandFields: true });

    // HTTP Method is rendered as a typeahead field with placeholder
    const methodField = getMethodField();
    expect(methodField).toBeInTheDocument();
    expect(methodField).toHaveValue('get');
  });

  it('should close modal when Cancel button is clicked without calling onAddMethod', async () => {
    const { getCancelButton } = await setupModal();

    fireEvent.click(getCancelButton());

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnAddMethod).not.toHaveBeenCalled();
  });

  it('should call onAddMethod with correct form data when Add button is clicked with valid data', async () => {
    const { formPageObject, getAddButton } = await setupModal({ expandFields: true });

    await formPageObject.inputText('Path', '/api/users');

    fireEvent.click(getAddButton());

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
