import { fireEvent } from '@testing-library/dom';
import { act, render } from '@testing-library/react';

import { InlineEdit } from './InlineEdit';
import { minLengthValidator } from './min-length-validator';

describe('InlineEdit', () => {
  const DATA_TESTID = 'inline';

  describe('Readonly mode', () => {
    it('should render correctly', () => {
      const wrapper = render(<InlineEdit value="My text" />);

      const textField = wrapper.getByText('My text');
      expect(textField).toBeInTheDocument();
    });

    it('should use an empty string as default value', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} />);

      expect(wrapper.getByTestId(DATA_TESTID)).toBeInTheDocument();
      expect(wrapper.getByTestId(DATA_TESTID)).toHaveTextContent('');
    });

    it.each([
      [() => {}, true],
      [undefined, false],
    ] as const)('should set data-clickable attribute according to onClick', (onClick, value) => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} onClick={onClick} />);

      expect(wrapper.getByTestId(DATA_TESTID)).toHaveAttribute('data-clickable', value.toString());
    });

    it('should render a pencil icon', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} />);

      expect(wrapper.getByTestId(DATA_TESTID + '--edit')).toBeInTheDocument();
    });

    it('should go to edit mode upon clicking on the pencil icon', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} />);
      const editButton = wrapper.getByTestId('inline--edit');

      act(() => {
        fireEvent.click(editButton);
      });

      const input = wrapper.getByTestId('inline--text-input');
      expect(input).toBeInTheDocument();
    });

    it('should go to edit mode and stop click event propagation', () => {
      const mouseEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = jest.spyOn(mouseEvent, 'stopPropagation');

      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} />);
      const editButton = wrapper.getByTestId('inline--edit');

      act(() => {
        fireEvent(editButton, mouseEvent);
      });

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Editable mode', () => {
    it('should set focus on input upon editing', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} />);
      const editButton = wrapper.getByTestId('inline--edit');

      act(() => {
        fireEvent.click(editButton);
      });

      const input = wrapper.getByTestId('inline--text-input');
      expect(input).toHaveFocus();
    });

    it('should start with a default validation status', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} />);
      const editButton = wrapper.getByTestId('inline--edit');

      act(() => {
        fireEvent.click(editButton);
      });

      const input = wrapper.getByTestId('inline--text-input');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should set a default validation statuts if the change is the same as the original value', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} value="My text" />);
      const editButton = wrapper.getByTestId('inline--edit');

      act(() => {
        fireEvent.click(editButton);
      });

      const input = wrapper.getByTestId('inline--text-input');

      act(() => {
        fireEvent.change(input, { target: { value: 'edited text' } });
        fireEvent.change(input, { target: { value: 'My text' } });
      });

      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should use the validator if available', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} value="My text" validator={minLengthValidator} />);
      const editButton = wrapper.getByTestId('inline--edit');

      act(() => {
        fireEvent.click(editButton);
      });

      act(() => {
        const input = wrapper.getByTestId('inline--text-input');
        fireEvent.change(input, { target: { value: 'none' } });
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });

      act(() => {
        const errorMessage = wrapper.getByText(/Value must be at least 5 characters long/, {
          exact: false,
        });
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should ignore the save action if the validation fails', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} value="My text" validator={minLengthValidator} />);

      act(() => {
        const editButton = wrapper.getByTestId('inline--edit');
        fireEvent.click(editButton);
      });

      act(() => {
        const input = wrapper.getByTestId('inline--text-input');
        fireEvent.change(input, { target: { value: 'none' } });
      });

      const saveButton = wrapper.getByTestId('inline--save');
      act(() => {
        fireEvent.click(saveButton);
      });

      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      const textField = wrapper.queryByTestId(DATA_TESTID);
      expect(textField).not.toBeInTheDocument();
    });

    it('should call the onChange callback if the validation succeeds', () => {
      const onChange = jest.fn();
      const wrapper = render(
        <InlineEdit data-testid={DATA_TESTID} value="My text" onChange={onChange} validator={minLengthValidator} />,
      );

      act(() => {
        const editButton = wrapper.getByTestId('inline--edit');
        fireEvent.click(editButton);
      });

      act(() => {
        const input = wrapper.getByTestId('inline--text-input');
        fireEvent.change(input, { target: { value: 'A new hope' } });
      });

      act(() => {
        const saveButton = wrapper.getByTestId('inline--save');
        fireEvent.click(saveButton);
      });

      expect(onChange).toHaveBeenCalledWith('A new hope');
    });

    it('should not call the onChange callback if the validation fails', () => {
      const onChange = jest.fn();
      const wrapper = render(
        <InlineEdit data-testid={DATA_TESTID} value="My text" onChange={onChange} validator={minLengthValidator} />,
      );

      act(() => {
        const editButton = wrapper.getByTestId('inline--edit');
        fireEvent.click(editButton);
      });

      act(() => {
        const input = wrapper.getByTestId('inline--text-input');
        fireEvent.change(input, { target: { value: 'none' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should not call the onChange callback if the value did not change', () => {
      const onChange = jest.fn();
      const wrapper = render(
        <InlineEdit data-testid={DATA_TESTID} value="My text" onChange={onChange} validator={minLengthValidator} />,
      );

      act(() => {
        const editButton = wrapper.getByTestId('inline--edit');
        fireEvent.click(editButton);
      });

      act(() => {
        const input = wrapper.getByTestId('inline--text-input');
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should return to read mode when the user presses the Escape key', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} />);

      act(() => {
        const editButton = wrapper.getByTestId('inline--edit');
        fireEvent.click(editButton);
      });

      act(() => {
        const input = wrapper.getByTestId('inline--text-input');
        fireEvent.keyDown(input, { key: 'Escape' });
      });

      const textField = wrapper.queryByTestId(DATA_TESTID);
      expect(textField).toBeInTheDocument();
    });

    it('should return to read mode and stop the event propagation when the user clicks on the cancel button', () => {
      const mouseEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = jest.spyOn(mouseEvent, 'stopPropagation');
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} />);

      act(() => {
        const editButton = wrapper.getByTestId('inline--edit');
        fireEvent.click(editButton);
      });

      act(() => {
        const cancelButton = wrapper.getByTestId('inline--cancel');
        fireEvent(cancelButton, mouseEvent);
      });

      const textField = wrapper.queryByTestId(DATA_TESTID);
      expect(textField).toBeInTheDocument();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should set the edit icon title', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} editTitle="Edit" />);

      const editButton = wrapper.getByTestId('inline--edit');
      expect(editButton).toHaveAttribute('title', 'Edit');
    });

    it('should set the text title', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} textTitle="Edit" />);

      const textSpan = wrapper.getByTestId(DATA_TESTID);
      expect(textSpan).toHaveAttribute('title', 'Edit');
    });
  });

  describe('Placeholder', () => {
    it('should display placeholder text when value is empty and placeholder is provided', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} placeholder="Enter value" />);

      const textSpan = wrapper.getByTestId(DATA_TESTID);
      expect(textSpan).toHaveTextContent('Enter value');
    });

    it('should display value instead of placeholder when value is provided', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} value="My value" placeholder="Enter value" />);

      const textSpan = wrapper.getByTestId(DATA_TESTID);
      expect(textSpan).toHaveTextContent('My value');
      expect(textSpan).not.toHaveTextContent('Enter value');
    });

    it('should not display placeholder when no placeholder prop is provided', () => {
      const wrapper = render(<InlineEdit data-testid={DATA_TESTID} />);

      const textSpan = wrapper.getByTestId(DATA_TESTID);
      expect(textSpan).toHaveTextContent('');
    });
  });
});
