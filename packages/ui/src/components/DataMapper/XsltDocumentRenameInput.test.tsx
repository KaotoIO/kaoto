import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ValidationResult, ValidationStatus } from '../../models';
import { XsltDocumentRenameInput } from './XsltDocumentRenameInput';

// Note: Using global PatternFly icons mock from vitest-mocks-setup.ts
// No need for local mock here

describe('XsltDocumentRenameInput', () => {
  const defaultProps = {
    value: 'Initial Document Name',
    'data-testid': 'rename-input',
    placeholder: 'Enter name...',
    textTitle: 'Document Title',
    editTitle: 'Edit Name',
  };

  describe('Read-only mode', () => {
    it('should render in read-only mode by default', () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);

      // Check if text value is displayed
      expect(screen.getByText('Initial Document Name')).toBeInTheDocument();

      // Check if the edit button is available
      const editBtn = screen.getByTestId('rename-input--edit');
      expect(editBtn).toBeInTheDocument();
      expect(editBtn).toHaveAttribute('title', 'Edit Name');

      // Form/Input should not be in the DOM yet
      expect(screen.queryByTestId('rename-input--text-input')).not.toBeInTheDocument();
    });

    it('should use empty string as default value when value prop is undefined', () => {
      const { rerender } = render(<XsltDocumentRenameInput data-testid="rename-input" placeholder="Enter name..." />);
      expect(screen.getByText('Enter name...')).toBeInTheDocument();

      // Verify it works with undefined explicitly
      rerender(<XsltDocumentRenameInput data-testid="rename-input" placeholder="Enter name..." value={undefined} />);
      expect(screen.getByText('Enter name...')).toBeInTheDocument();
    });

    it('should display the placeholder if no initial value is provided', () => {
      render(<XsltDocumentRenameInput {...defaultProps} value="" />);
      expect(screen.getByText('Enter name...')).toBeInTheDocument();
    });

    it('should render text span with correct title and aria-label', () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const span = screen.getByText('Initial Document Name');
      expect(span).toHaveAttribute('title', 'Document Title');
      expect(span).toHaveAttribute('aria-label', 'Document Title');
    });

    it('should switch to edit mode when the edit button is clicked', async () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));

      // Input should be visible and contain the current value
      const input = screen.getByTestId('rename-input--text-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Initial Document Name');
    });

    it('should stop event propagation when clicking the edit button', () => {
      const mouseEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = vi.spyOn(mouseEvent, 'stopPropagation');

      render(<XsltDocumentRenameInput {...defaultProps} />);
      const editButton = screen.getByTestId('rename-input--edit');

      fireEvent(editButton, mouseEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should call onEditingStateChange with true when entering edit mode', async () => {
      const mockOnEditingStateChange = vi.fn();
      render(<XsltDocumentRenameInput {...defaultProps} onEditingStateChange={mockOnEditingStateChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));

      expect(mockOnEditingStateChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Edit mode', () => {
    it('should focus the input when entering edit mode', async () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));

      const input = screen.getByTestId('rename-input--text-input');
      expect(input).toHaveFocus();
    });

    it('should have correct ARIA attributes on the input', async () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));

      const input = screen.getByTestId('rename-input--text-input');
      expect(input).toHaveAttribute('aria-label', 'xslt-document-rename-value');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should render save and cancel buttons with correct ARIA labels', async () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));

      const saveButton = screen.getByTestId('rename-input--save');
      const cancelButton = screen.getByTestId('rename-input--cancel');

      expect(saveButton).toHaveAttribute('aria-label', 'Save value');
      expect(cancelButton).toHaveAttribute('aria-label', 'Cancel editing');
    });

    it('should trigger validation on input change', async () => {
      const mockValidator = vi.fn().mockImplementation((val: string): ValidationResult => {
        if (val.length < 3) {
          return { status: ValidationStatus.Error, errMessages: ['Name is too short'] };
        }
        return { status: ValidationStatus.Default, errMessages: [] };
      });

      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.clear(input);
      await user.type(input, 'hi');

      expect(mockValidator).toHaveBeenCalledWith('hi');
    });

    it('should display validation error messages', async () => {
      const mockValidator = vi.fn().mockImplementation((val: string): ValidationResult => {
        if (val.length < 3) {
          return { status: ValidationStatus.Error, errMessages: ['Name is too short'] };
        }
        return { status: ValidationStatus.Default, errMessages: [] };
      });

      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.clear(input);
      await user.type(input, 'hi');

      expect(screen.getByText('Name is too short')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should disable save button when validation fails', async () => {
      const mockValidator = vi.fn().mockImplementation((val: string): ValidationResult => {
        if (val.length < 3) {
          return { status: ValidationStatus.Error, errMessages: ['Name is too short'] };
        }
        return { status: ValidationStatus.Default, errMessages: [] };
      });

      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.clear(input);
      await user.type(input, 'hi');

      expect(screen.getByTestId('rename-input--save')).toBeDisabled();
    });

    it('should reset validation when input value matches the original prop value', async () => {
      const mockValidator = vi.fn().mockReturnValue({
        status: ValidationStatus.Error,
        errMessages: ['Invalid value'],
      });

      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      // Change to a different value (triggers validation error)
      await user.clear(input);
      await user.type(input, 'Different Value');
      expect(mockValidator).toHaveBeenCalledWith('Different Value');

      // Change back to original value (should reset validation)
      await user.clear(input);
      await user.type(input, 'Initial Document Name');

      // Validation should be reset to default
      expect(screen.queryByText('Invalid value')).not.toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should handle async validator that returns a Promise', async () => {
      const mockValidator = vi
        .fn()
        .mockImplementation(
          (val: string): Promise<ValidationResult> =>
            Promise.resolve(
              val.length < 5
                ? { status: ValidationStatus.Error, errMessages: ['Too short'] }
                : { status: ValidationStatus.Default, errMessages: [] },
            ),
        );

      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.clear(input);
      await user.type(input, 'Hi');

      // Wait for async validation to complete
      await waitFor(() => {
        expect(screen.getByText('Too short')).toBeInTheDocument();
      });

      expect(mockValidator).toHaveBeenCalledWith('Hi');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should stop event propagation on keyboard events in input field', async () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      const keyDownEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      const stopPropagationSpy = vi.spyOn(keyDownEvent, 'stopPropagation');

      fireEvent(input, keyDownEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should handle validator throwing an error', async () => {
      const mockValidator = vi.fn().mockImplementation(() => {
        throw new Error('Validator crashed');
      });

      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.clear(input);
      await user.type(input, 'New Value');

      // Should show generic error message
      await waitFor(() => {
        expect(screen.getByText('Validation failed. Please try again.')).toBeInTheDocument();
      });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByTestId('rename-input--save')).toBeDisabled();
    });

    it('should handle async validator throwing an error', async () => {
      const mockValidator = vi.fn().mockRejectedValue(new Error('Async validator crashed'));

      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.clear(input);
      await user.type(input, 'New Value');

      // Should show generic error message
      await waitFor(() => {
        expect(screen.getByText('Validation failed. Please try again.')).toBeInTheDocument();
      });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByTestId('rename-input--save')).toBeDisabled();
    });
  });

  describe('Save functionality', () => {
    it('should call onChange with the new value on save', async () => {
      const mockOnChange = vi.fn().mockResolvedValue(undefined);
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.type(input, ' Updated');
      await user.click(screen.getByTestId('rename-input--save'));

      expect(mockOnChange).toHaveBeenCalledWith('Initial Document Name Updated');
    });

    it('should return to read-only mode after saving', async () => {
      const mockOnChange = vi.fn().mockResolvedValue(undefined);
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.type(input, ' Updated');
      await user.click(screen.getByTestId('rename-input--save'));

      // UI should flip back to read-only text view
      await waitFor(() => {
        expect(screen.getByText('Initial Document Name Updated')).toBeInTheDocument();
      });
    });

    it('should save the value when hitting the Enter key', async () => {
      const mockOnChange = vi.fn();
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.type(input, ' New{enter}');

      expect(mockOnChange).toHaveBeenCalledWith('Initial Document Name New');
    });

    it('should not save when validation status is Error', async () => {
      const mockOnChange = vi.fn();
      const mockValidator = vi.fn().mockReturnValue({
        status: ValidationStatus.Error,
        errMessages: ['Invalid'],
      });

      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} validator={mockValidator} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.clear(input);
      await user.type(input, 'x{enter}');

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not call onChange when value has not changed', async () => {
      const mockOnChange = vi.fn();
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      await user.click(screen.getByTestId('rename-input--save'));

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should handle synchronous onChange (non-Promise)', async () => {
      const mockOnChange = vi.fn(); // Returns undefined (not a Promise)
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.type(input, ' Sync');
      await user.click(screen.getByTestId('rename-input--save'));

      expect(mockOnChange).toHaveBeenCalledWith('Initial Document Name Sync');

      await waitFor(() => {
        expect(screen.queryByTestId('rename-input--text-input')).not.toBeInTheDocument();
      });
    });

    it('should stop event propagation when clicking the save button', async () => {
      const mockOnChange = vi.fn();
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');
      await user.type(input, ' Change');

      const mouseEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = vi.spyOn(mouseEvent, 'stopPropagation');

      const saveButton = screen.getByTestId('rename-input--save');
      fireEvent(saveButton, mouseEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should disable input and buttons while saving', async () => {
      let resolveSave: (value: unknown) => void = () => {};
      const mockOnChange = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveSave = resolve;
        });
      });

      const { rerender } = render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');
      await user.type(input, ' Change');
      await user.click(screen.getByTestId('rename-input--save'));

      // Verify everything is disabled while saving
      expect(input).toBeDisabled();
      expect(screen.getByTestId('rename-input--save')).toBeDisabled();
      expect(screen.getByTestId('rename-input--cancel')).toBeDisabled();

      // Release the promise
      resolveSave(null);

      // Re-render with updated value
      await waitFor(() => {
        rerender(
          <XsltDocumentRenameInput {...defaultProps} value="Initial Document Name Change" onChange={mockOnChange} />,
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Initial Document Name Change')).toBeInTheDocument();
      });
    });

    it('should handle onChange throwing an error', async () => {
      const mockOnChange = vi.fn().mockRejectedValue(new Error('Save failed'));
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.type(input, ' Updated');
      await user.click(screen.getByTestId('rename-input--save'));

      // Should show error message and stay in edit mode
      await waitFor(() => {
        expect(screen.getByText('Unable to save document name. Please try again.')).toBeInTheDocument();
      });

      // Should still be in edit mode with the input visible
      expect(screen.getByTestId('rename-input--text-input')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByTestId('rename-input--save')).toBeDisabled();
    });

    it('should call onEditingStateChange with false when saving successfully', async () => {
      const mockOnChange = vi.fn().mockResolvedValue(undefined);
      const mockOnEditingStateChange = vi.fn();
      render(
        <XsltDocumentRenameInput
          {...defaultProps}
          onChange={mockOnChange}
          onEditingStateChange={mockOnEditingStateChange}
        />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      expect(mockOnEditingStateChange).toHaveBeenCalledWith(true);

      const input = screen.getByTestId('rename-input--text-input');
      await user.type(input, ' Updated');
      await user.click(screen.getByTestId('rename-input--save'));

      await waitFor(() => {
        expect(mockOnEditingStateChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Cancel functionality', () => {
    it('should revert to original value when canceling', async () => {
      const mockOnChange = vi.fn();
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.clear(input);
      await user.type(input, 'Accidental Draft Text');
      await user.click(screen.getByTestId('rename-input--cancel'));

      expect(screen.getByText('Initial Document Name')).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should reset validation when canceling', async () => {
      const mockValidator = vi.fn().mockReturnValue({
        status: ValidationStatus.Error,
        errMessages: ['Invalid'],
      });

      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.clear(input);
      await user.type(input, 'x');

      // Verify error is shown
      expect(screen.getByText('Invalid')).toBeInTheDocument();

      await user.click(screen.getByTestId('rename-input--cancel'));

      // Should be back in read-only mode without errors
      expect(screen.getByText('Initial Document Name')).toBeInTheDocument();
      expect(screen.queryByText('Invalid')).not.toBeInTheDocument();
    });

    it('should cancel changes when hitting the Escape key', async () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      const input = screen.getByTestId('rename-input--text-input');

      await user.type(input, 'Random Text{escape}');

      expect(screen.getByText('Initial Document Name')).toBeInTheDocument();
    });

    it('should stop event propagation when clicking the cancel button', async () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));

      const mouseEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = vi.spyOn(mouseEvent, 'stopPropagation');

      const cancelButton = screen.getByTestId('rename-input--cancel');
      fireEvent(cancelButton, mouseEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should call onEditingStateChange with false when canceling', async () => {
      const mockOnEditingStateChange = vi.fn();
      render(<XsltDocumentRenameInput {...defaultProps} onEditingStateChange={mockOnEditingStateChange} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));
      expect(mockOnEditingStateChange).toHaveBeenCalledWith(true);

      const input = screen.getByTestId('rename-input--text-input');
      await user.clear(input);
      await user.type(input, 'Some changes');
      await user.click(screen.getByTestId('rename-input--cancel'));

      expect(mockOnEditingStateChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Form behavior', () => {
    it('should prevent default form submission behavior', async () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('rename-input--edit'));

      const form = screen.getByTestId('rename-input--form').closest('form');
      expect(form).toBeInTheDocument();

      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');

      form?.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
