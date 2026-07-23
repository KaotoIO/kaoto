import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AddMethodModal } from './AddMethodModal';

describe('AddMethodModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAddMethod = vi.fn();

  // Helper to render modal and return common test utilities
  const setupModal = () => {
    render(<AddMethodModal open onClose={mockOnClose} onAddMethod={mockOnAddMethod} />);

    return {
      getMethodSelect: () => screen.getByLabelText('HTTP Method') as HTMLSelectElement,
      getPathInput: () => screen.getByLabelText('Path') as HTMLInputElement,
      getIdInput: () => screen.getByLabelText('ID') as HTMLInputElement,
      getCancelButton: () => screen.getByRole('button', { name: 'Cancel' }),
      getAddButton: () => screen.getByRole('button', { name: 'Add' }),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with correct title and structure', () => {
    render(<AddMethodModal open onClose={mockOnClose} onAddMethod={mockOnAddMethod} />);

    expect(screen.getByText('Add REST Method')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('should initialize HTTP Method select with default value "get"', () => {
    const { getMethodSelect } = setupModal();
    expect(getMethodSelect().value).toBe('get');
  });

  it('should list all supported HTTP methods in the select', () => {
    setupModal();
    const select = screen.getByLabelText('HTTP Method') as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(expect.arrayContaining(['get', 'post', 'put', 'delete', 'patch', 'head']));
  });

  it('should close modal when Cancel button is clicked without calling onAddMethod', () => {
    const { getCancelButton } = setupModal();

    fireEvent.click(getCancelButton());

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnAddMethod).not.toHaveBeenCalled();
  });

  it('should call onAddMethod with default "get" method when no method change is made', async () => {
    const { getPathInput, getAddButton } = setupModal();

    fireEvent.change(getPathInput(), { target: { value: '/api/users' } });
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

  /**
   * Regression test for https://github.com/KaotoIO/kaoto/issues/3474
   *
   * Previously the HTTP Method field was rendered as a typeahead (KaotoForm EnumField).
   * Carbon's typeahead does not fire its selection callback when the user types an
   * exact match and confirms with Enter — the dropdown closed visually but the model
   * remained 'get'. Now we use a plain <Select> which always reflects the current
   * value via its onChange event, making keyboard selection reliable.
   */
  it('should create a POST operation when the HTTP Method select is changed to "post" (regression #3474)', async () => {
    const { getMethodSelect, getPathInput, getAddButton } = setupModal();

    // Change the select value — this simulates both mouse selection AND keyboard navigation
    fireEvent.change(getMethodSelect(), { target: { value: 'post' } });
    expect(getMethodSelect().value).toBe('post');

    fireEvent.change(getPathInput(), { target: { value: '/api/items' } });
    fireEvent.click(getAddButton());

    await waitFor(() => {
      expect(mockOnAddMethod).toHaveBeenCalledTimes(1);
      expect(mockOnAddMethod).toHaveBeenCalledWith({
        method: 'post',
        path: '/api/items',
      });
    });
  });

  it('should update formModel correctly for all supported HTTP methods', async () => {
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'head'] as const;

    for (const m of methods) {
      mockOnAddMethod.mockClear();
      mockOnClose.mockClear();

      const { unmount } = render(<AddMethodModal open onClose={mockOnClose} onAddMethod={mockOnAddMethod} />);
      const select = screen.getByLabelText('HTTP Method') as HTMLSelectElement;
      const pathInput = screen.getByLabelText('Path') as HTMLInputElement;
      const addBtn = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(select, { target: { value: m } });
      fireEvent.change(pathInput, { target: { value: '/test' } });
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(mockOnAddMethod).toHaveBeenCalledWith(expect.objectContaining({ method: m }));
      });

      unmount();
    }
  });

  it('should show validation error when path is empty and not call onAddMethod', async () => {
    const { getAddButton } = setupModal();

    fireEvent.click(getAddButton());

    await waitFor(() => {
      expect(screen.getByText('Path is required')).toBeInTheDocument();
      expect(mockOnAddMethod).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('should include optional id when provided', async () => {
    const { getPathInput, getIdInput, getAddButton } = setupModal();

    fireEvent.change(getPathInput(), { target: { value: '/api/resource' } });
    fireEvent.change(getIdInput(), { target: { value: 'my-get-operation' } });
    fireEvent.click(getAddButton());

    await waitFor(() => {
      expect(mockOnAddMethod).toHaveBeenCalledWith({
        method: 'get',
        path: '/api/resource',
        id: 'my-get-operation',
      });
    });
  });

  it('should omit id from the model when id field is left empty', async () => {
    const { getPathInput, getAddButton } = setupModal();

    fireEvent.change(getPathInput(), { target: { value: '/api/resource' } });
    fireEvent.click(getAddButton());

    await waitFor(() => {
      expect(mockOnAddMethod).toHaveBeenCalledWith({
        method: 'get',
        path: '/api/resource',
      });
      // id should be undefined, not included in the call
      expect(mockOnAddMethod.mock.calls[0][0]).not.toHaveProperty('id', expect.anything());
    });
  });

  it('should trim whitespace from path and id values', async () => {
    const { getPathInput, getIdInput, getAddButton } = setupModal();

    fireEvent.change(getPathInput(), { target: { value: '  /api/items  ' } });
    fireEvent.change(getIdInput(), { target: { value: '  my-id  ' } });
    fireEvent.click(getAddButton());

    await waitFor(() => {
      expect(mockOnAddMethod).toHaveBeenCalledWith({
        method: 'get',
        path: '/api/items',
        id: 'my-id',
      });
    });
  });

  it('should clear path validation error when the user starts typing', async () => {
    const { getPathInput, getAddButton } = setupModal();

    // Trigger validation error
    fireEvent.click(getAddButton());
    await waitFor(() => {
      expect(screen.getByText('Path is required')).toBeInTheDocument();
    });

    // Start typing in path — error should clear
    await act(async () => {
      fireEvent.change(getPathInput(), { target: { value: '/' } });
    });
    expect(screen.queryByText('Path is required')).not.toBeInTheDocument();
  });
});
