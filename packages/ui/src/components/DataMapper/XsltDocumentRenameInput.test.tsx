import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ValidationResult, ValidationStatus } from '../../models';
import { XsltDocumentRenameInput } from './XsltDocumentRenameInput';

describe('XsltDocumentRenameInput', () => {
  const defaultProps = {
    value: 'Initial Document Name',
    'data-testid': 'rename-input',
    placeholder: 'Enter name...',
    textTitle: 'Document Title',
    editTitle: 'Edit Name',
  };

  const getInput = () => screen.getByRole('textbox');
  const getSaveButton = () => screen.getByRole('button', { name: 'Save value' });
  const getCancelButton = () => screen.getByRole('button', { name: 'Cancel editing' });

  const shortNameValidator = (val: string): ValidationResult =>
    val.length < 3
      ? { status: ValidationStatus.Error, errMessages: ['Name is too short'] }
      : { status: ValidationStatus.Default, errMessages: [] };

  /** Focuses the input, replaces its content and returns it */
  const replaceValue = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
    const input = getInput();
    await user.click(input);
    await user.clear(input);
    await user.type(input, text);
    return input;
  };

  describe('Rendering', () => {
    it('should render the current value in an input with the provided accessible name', () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);

      expect(screen.getByTestId('rename-input')).toBeInTheDocument();
      const input = getInput();
      expect(input).toHaveValue('Initial Document Name');
      expect(input).toHaveAccessibleName('Document Title');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should use a default accessible name when textTitle is not provided', () => {
      render(<XsltDocumentRenameInput {...defaultProps} textTitle={undefined} />);

      expect(getInput()).toHaveAccessibleName('XSLT document name');
    });

    it('should render the edit button with the provided title', () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Edit Name' })).toBeInTheDocument();
    });

    it('should use empty string as default value when value prop is undefined', () => {
      render(<XsltDocumentRenameInput data-testid="rename-input" placeholder="Enter name..." />);

      const input = getInput();
      expect(input).toHaveValue('');
      expect(input).toHaveAttribute('placeholder', 'Enter name...');
    });

    it('should not show the save and cancel buttons until the input is focused', async () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const user = userEvent.setup();

      expect(screen.queryByRole('button', { name: 'Save value' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel editing' })).not.toBeInTheDocument();

      await user.click(getInput());

      expect(getSaveButton()).toBeInTheDocument();
      expect(getCancelButton()).toBeInTheDocument();
    });

    it.each([
      ['click', new MouseEvent('click', { bubbles: true })],
      ['keydown', new KeyboardEvent('keydown', { key: 'a', bubbles: true })],
    ])('should stop %s event propagation', (_type, event) => {
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      render(<XsltDocumentRenameInput {...defaultProps} />);
      fireEvent(getInput(), event);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Editing state', () => {
    it('should call onEditingStateChange with true when the value is modified', async () => {
      const mockOnEditingStateChange = vi.fn();
      render(<XsltDocumentRenameInput {...defaultProps} onEditingStateChange={mockOnEditingStateChange} />);
      const user = userEvent.setup();

      await user.click(getInput());
      expect(mockOnEditingStateChange).not.toHaveBeenCalled();

      await user.type(getInput(), 'x');

      expect(mockOnEditingStateChange).toHaveBeenCalledWith(true);
    });

    it('should call onEditingStateChange with false when canceling', async () => {
      const mockOnEditingStateChange = vi.fn();
      render(<XsltDocumentRenameInput {...defaultProps} onEditingStateChange={mockOnEditingStateChange} />);
      const user = userEvent.setup();

      await replaceValue(user, 'Some changes');
      expect(mockOnEditingStateChange).toHaveBeenLastCalledWith(true);

      await user.click(getCancelButton());

      expect(mockOnEditingStateChange).toHaveBeenLastCalledWith(false);
    });

    it('should call onEditingStateChange with false when the saved value is applied', async () => {
      const mockOnChange = vi.fn().mockResolvedValue(undefined);
      const mockOnEditingStateChange = vi.fn();
      const { rerender } = render(
        <XsltDocumentRenameInput
          {...defaultProps}
          onChange={mockOnChange}
          onEditingStateChange={mockOnEditingStateChange}
        />,
      );
      const user = userEvent.setup();

      await user.click(getInput());
      await user.type(getInput(), ' Updated');
      expect(mockOnEditingStateChange).toHaveBeenLastCalledWith(true);
      await user.click(getSaveButton());

      rerender(
        <XsltDocumentRenameInput
          {...defaultProps}
          value="Initial Document Name Updated"
          onChange={mockOnChange}
          onEditingStateChange={mockOnEditingStateChange}
        />,
      );

      await waitFor(() => {
        expect(mockOnEditingStateChange).toHaveBeenLastCalledWith(false);
      });
    });
  });

  describe('Validation', () => {
    it('should validate the input change, display the error and disable the save button', async () => {
      const mockValidator = vi.fn().mockImplementation(shortNameValidator);
      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      const input = await replaceValue(user, 'hi');

      expect(mockValidator).toHaveBeenCalledWith('hi');
      expect(screen.getByText('Name is too short')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(getSaveButton()).toBeDisabled();
    });

    it('should reset validation when input value matches the original prop value', async () => {
      const mockValidator = vi.fn().mockReturnValue({
        status: ValidationStatus.Error,
        errMessages: ['Invalid value'],
      });
      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      const input = await replaceValue(user, 'Different Value');
      expect(mockValidator).toHaveBeenCalledWith('Different Value');
      expect(screen.getByText('Invalid value')).toBeInTheDocument();

      await user.clear(input);
      await user.type(input, 'Initial Document Name');

      expect(screen.queryByText('Invalid value')).not.toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it.each(['original value', 'removed validator'] as const)(
      'ignores pending validation after switching to %s',
      async (change) => {
        let resolveValidation!: (result: ValidationResult) => void;
        const validator = vi.fn(
          () =>
            new Promise<ValidationResult>((resolve) => {
              resolveValidation = resolve;
            }),
        );
        const { rerender } = render(<XsltDocumentRenameInput {...defaultProps} validator={validator} />);
        const input = getInput();
        fireEvent.change(input, { target: { value: 'Changed name' } });

        if (change === 'original value') {
          fireEvent.change(input, { target: { value: defaultProps.value } });
        } else {
          rerender(<XsltDocumentRenameInput {...defaultProps} />);
        }

        await act(async () => {
          resolveValidation({ status: ValidationStatus.Error, errMessages: ['Obsolete warning'] });
        });

        expect(screen.queryByText('Obsolete warning')).not.toBeInTheDocument();
        expect(input).toHaveAttribute('aria-invalid', 'false');
      },
    );

    it('keeps a newer validation pending when an older validation completes', async () => {
      const pending = new Map<string, (result: ValidationResult) => void>();
      const validator = vi.fn(
        (name: string) =>
          new Promise<ValidationResult>((resolve) => {
            pending.set(name, resolve);
          }),
      );
      render(<XsltDocumentRenameInput {...defaultProps} validator={validator} />);
      const input = getInput();
      fireEvent.change(input, { target: { value: 'First name' } });
      fireEvent.change(input, { target: { value: 'Second name' } });

      await act(async () => {
        pending.get('First name')!({ status: ValidationStatus.Error, errMessages: ['Obsolete warning'] });
      });
      expect(screen.queryByText('Obsolete warning')).not.toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'false');

      await act(async () => {
        pending.get('Second name')!({ status: ValidationStatus.Error, errMessages: ['Current warning'] });
      });
      expect(screen.getByText('Current warning')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
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

      const input = await replaceValue(user, 'Hi');

      await waitFor(() => {
        expect(screen.getByText('Too short')).toBeInTheDocument();
      });
      expect(mockValidator).toHaveBeenCalledWith('Hi');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it.each([
      [
        'throwing',
        () => {
          throw new Error('Validator crashed');
        },
      ],
      ['rejecting', () => Promise.reject(new Error('Async validator crashed'))],
    ])('should handle a validator %s an error', async (_kind, validatorImpl) => {
      const mockValidator = vi.fn().mockImplementation(validatorImpl);
      render(<XsltDocumentRenameInput {...defaultProps} validator={mockValidator} />);
      const user = userEvent.setup();

      const input = await replaceValue(user, 'New Value');

      await waitFor(() => {
        expect(screen.getByText('Validation failed. Please try again.')).toBeInTheDocument();
      });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(getSaveButton()).toBeDisabled();
    });
  });

  describe('Save functionality', () => {
    it('should call onChange with the new value on save', async () => {
      const mockOnChange = vi.fn().mockResolvedValue(undefined);
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(getInput());
      await user.type(getInput(), ' Updated');
      await user.click(getSaveButton());

      expect(mockOnChange).toHaveBeenCalledWith('Initial Document Name Updated');
    });

    it('should save the value when hitting the Enter key', async () => {
      const mockOnChange = vi.fn();
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(getInput());
      await user.type(getInput(), ' New{enter}');

      expect(mockOnChange).toHaveBeenCalledWith('Initial Document Name New');
    });

    it('should not save when the input loses focus', async () => {
      const mockOnChange = vi.fn();
      render(
        <>
          <XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />
          <button type="button">Elsewhere</button>
        </>,
      );
      const user = userEvent.setup();

      await user.click(getInput());
      await user.type(getInput(), ' Draft');
      await user.click(screen.getByRole('button', { name: 'Elsewhere' }));

      expect(mockOnChange).not.toHaveBeenCalled();
      expect(getInput()).toHaveValue('Initial Document Name Draft');
    });

    it('should not save when validation status is Error', async () => {
      const mockOnChange = vi.fn();
      const mockValidator = vi.fn().mockReturnValue({
        status: ValidationStatus.Error,
        errMessages: ['Invalid'],
      });
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} validator={mockValidator} />);
      const user = userEvent.setup();

      await replaceValue(user, 'x{enter}');

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not call onChange when value has not changed', async () => {
      const mockOnChange = vi.fn();
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(getInput());
      expect(getSaveButton()).toBeDisabled();
      await user.keyboard('{enter}');

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should validate before saving when validation has not settled yet', async () => {
      const mockOnChange = vi.fn().mockResolvedValue(undefined);
      let resolveValidation!: (result: ValidationResult) => void;
      const validator = vi.fn(
        () =>
          new Promise<ValidationResult>((resolve) => {
            resolveValidation = resolve;
          }),
      );
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} validator={validator} />);
      const user = userEvent.setup();

      await user.click(getInput());
      await user.type(getInput(), ' Pending');
      await user.click(getSaveButton());
      expect(mockOnChange).not.toHaveBeenCalled();

      await act(async () => {
        resolveValidation({ status: ValidationStatus.Default, errMessages: [] });
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('Initial Document Name Pending');
      });
    });

    it('should not save when pending validation completes with an error', async () => {
      const mockOnChange = vi.fn();
      const validator = vi.fn(() =>
        Promise.resolve<ValidationResult>({ status: ValidationStatus.Error, errMessages: ['Rejected late'] }),
      );
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} validator={validator} />);
      const user = userEvent.setup();

      await user.click(getInput());
      await user.type(getInput(), ' Late{enter}');

      await waitFor(() => {
        expect(screen.getByText('Rejected late')).toBeInTheDocument();
      });
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should ignore input changes while saving', async () => {
      let resolveSave: (value: unknown) => void = () => {};
      const mockOnChange = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveSave = resolve;
        });
      });
      const onEditingStateChange = vi.fn();
      render(
        <XsltDocumentRenameInput
          {...defaultProps}
          onChange={mockOnChange}
          onEditingStateChange={onEditingStateChange}
        />,
      );
      const user = userEvent.setup();

      await user.click(getInput());
      await user.type(getInput(), ' Change');
      await user.keyboard('{enter}');
      expect(mockOnChange).toHaveBeenCalledTimes(1);

      fireEvent.change(getInput(), { target: { value: 'Typed while saving' } });
      expect(getInput()).toHaveValue('Initial Document Name Change');

      // A second save request while saving is ignored
      await user.click(getInput());
      await user.keyboard('{enter}');
      expect(mockOnChange).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSave(null);
      });
      // Editing continues until the new value is received through the value prop
      expect(onEditingStateChange).toHaveBeenLastCalledWith(true);
    });

    it('should handle onChange throwing an error', async () => {
      const mockOnChange = vi.fn().mockRejectedValue(new Error('Save failed'));
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(getInput());
      await user.type(getInput(), ' Updated');
      await user.click(getSaveButton());

      await waitFor(() => {
        expect(screen.getByText('Unable to save document name. Please try again.')).toBeInTheDocument();
      });
      expect(getInput()).toHaveValue('Initial Document Name Updated');
      expect(getInput()).toHaveAttribute('aria-invalid', 'true');
      expect(getSaveButton()).toBeDisabled();
    });

    it('should keep cancel enabled and restore the original value after a failed save', async () => {
      const mockOnChange = vi.fn().mockRejectedValue(new Error('Save failed'));
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} />);
      const user = userEvent.setup();

      await user.click(getInput());
      await user.type(getInput(), ' Updated');
      await user.click(getSaveButton());

      await waitFor(() => {
        expect(screen.getByText('Unable to save document name. Please try again.')).toBeInTheDocument();
      });
      expect(getCancelButton()).toBeEnabled();

      await user.click(getCancelButton());

      expect(getInput()).toHaveValue('Initial Document Name');
      expect(screen.queryByText('Unable to save document name. Please try again.')).not.toBeInTheDocument();
    });
  });

  describe('Cancel functionality', () => {
    it('should revert to the original value and reset validation when canceling', async () => {
      const mockOnChange = vi.fn();
      const mockValidator = vi.fn().mockReturnValue({
        status: ValidationStatus.Error,
        errMessages: ['Invalid'],
      });
      render(<XsltDocumentRenameInput {...defaultProps} onChange={mockOnChange} validator={mockValidator} />);
      const user = userEvent.setup();

      await replaceValue(user, 'x');
      expect(screen.getByText('Invalid')).toBeInTheDocument();

      await user.click(getCancelButton());

      expect(getInput()).toHaveValue('Initial Document Name');
      expect(screen.queryByText('Invalid')).not.toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should cancel changes when hitting the Escape key', async () => {
      render(<XsltDocumentRenameInput {...defaultProps} />);
      const user = userEvent.setup();

      await user.click(getInput());
      await user.type(getInput(), 'Random Text{escape}');

      expect(getInput()).toHaveValue('Initial Document Name');
    });
  });
});
