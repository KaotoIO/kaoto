import { act, fireEvent, render, screen } from '@testing-library/react';
import { Mock, vi } from 'vitest';

import { NameValidation, NameValidationStatus } from '../../models/datamapper/visualization';
import { NameInputPlaceholder } from './NameInputPlaceholder';

describe('NameInputPlaceholder', () => {
  let mockValidate: Mock<(name: string) => NameValidation>;
  let mockOnSubmit: Mock<(name: string) => void>;
  let mockOnCancel: Mock<() => void>;

  const TEST_PREFIX = 'test-name';

  beforeEach(() => {
    mockValidate = vi.fn((name: string) => {
      if (!name) return { status: NameValidationStatus.EMPTY };
      if (name.startsWith('invalid')) return { status: NameValidationStatus.ERROR, error: 'Invalid name' };
      return { status: NameValidationStatus.SUCCESS };
    });
    mockOnSubmit = vi.fn();
    mockOnCancel = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderPlaceholder(initialName?: string) {
    return render(
      <NameInputPlaceholder
        initialName={initialName}
        validate={mockValidate}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        placeholder="test name"
        testIdPrefix={TEST_PREFIX}
        ariaLabelPrefix="test"
      />,
    );
  }

  it('should render with empty input and disabled submit', () => {
    renderPlaceholder();

    const input = screen.getByTestId(`${TEST_PREFIX}-name-input`);
    expect(input).toHaveValue('');
    expect(screen.getByTestId(`${TEST_PREFIX}-submit-btn`)).toBeDisabled();
  });

  it('should auto-focus input on mount', () => {
    renderPlaceholder();

    const input = screen.getByTestId(`${TEST_PREFIX}-name-input`);
    expect(document.activeElement).toBe(input);
  });

  it('should auto-select text when initialName is provided', () => {
    const selectSpy = vi.spyOn(HTMLInputElement.prototype, 'select');
    renderPlaceholder('existing');

    expect(selectSpy).toHaveBeenCalled();
  });

  it('should enable submit when validate returns SUCCESS', () => {
    renderPlaceholder();

    const input = screen.getByTestId(`${TEST_PREFIX}-name-input`);
    act(() => {
      fireEvent.change(input, { target: { value: 'validName' } });
    });

    expect(screen.getByTestId(`${TEST_PREFIX}-submit-btn`)).toBeEnabled();
  });

  it('should disable submit and show error when validate returns ERROR', () => {
    renderPlaceholder();

    const input = screen.getByTestId(`${TEST_PREFIX}-name-input`);
    act(() => {
      fireEvent.change(input, { target: { value: 'invalidName' } });
    });

    expect(screen.getByTestId(`${TEST_PREFIX}-submit-btn`)).toBeDisabled();
    expect(screen.getByTestId(`${TEST_PREFIX}-name-input-error`)).toHaveTextContent('Invalid name');
  });

  it('should call onSubmit with name on submit button click', () => {
    renderPlaceholder();

    const input = screen.getByTestId(`${TEST_PREFIX}-name-input`);
    act(() => {
      fireEvent.change(input, { target: { value: 'validName' } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId(`${TEST_PREFIX}-submit-btn`));
    });

    expect(mockOnSubmit).toHaveBeenCalledWith('validName');
  });

  it('should call onSubmit on Enter key when valid', () => {
    renderPlaceholder();

    const input = screen.getByTestId(`${TEST_PREFIX}-name-input`);
    act(() => {
      fireEvent.change(input, { target: { value: 'validName' } });
    });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(mockOnSubmit).toHaveBeenCalledWith('validName');
  });

  it('should not call onSubmit on Enter key when invalid', () => {
    renderPlaceholder();

    const input = screen.getByTestId(`${TEST_PREFIX}-name-input`);
    act(() => {
      fireEvent.change(input, { target: { value: 'invalidName' } });
    });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onCancel on cancel button click', () => {
    renderPlaceholder();

    act(() => {
      fireEvent.click(screen.getByTestId(`${TEST_PREFIX}-cancel-btn`));
    });

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onCancel on Escape key', () => {
    renderPlaceholder();

    const input = screen.getByTestId(`${TEST_PREFIX}-name-input`);
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should render with initialName pre-populated', () => {
    renderPlaceholder('existing');

    const input = screen.getByTestId(`${TEST_PREFIX}-name-input`);
    expect(input).toHaveValue('existing');
  });
});
