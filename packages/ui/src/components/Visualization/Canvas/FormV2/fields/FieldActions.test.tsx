import { act, fireEvent, render } from '@testing-library/react';
import { FieldActions, FieldActionsProps } from './FieldActions';

describe('FieldActions', () => {
  const defaultProps: FieldActionsProps = {
    propName: 'testProp',
    clearAriaLabel: 'Clear field',
    toggleRawAriaLabel: 'Toggle RAW wrap for field',
    onRemove: jest.fn(),
    toggleRawValueWrap: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the MenuToggle button', () => {
    const wrapper = render(<FieldActions {...defaultProps} />);

    expect(wrapper.getByTestId('testProp__field-actions')).toBeInTheDocument();
  });

  it('opens and closes the dropdown when MenuToggle is clicked', async () => {
    const wrapper = render(<FieldActions {...defaultProps} />);

    const toggle = wrapper.getByTestId('testProp__field-actions');

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(wrapper.getByRole('menu')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(wrapper.queryByTestId('testProp__clear')).not.toBeInTheDocument();
  });

  it('calls onRemove when Clear is clicked', async () => {
    const wrapper = render(<FieldActions {...defaultProps} />);

    await act(async () => {
      fireEvent.click(wrapper.getByTestId('testProp__field-actions'));
    });

    const clearItem = wrapper.getByLabelText('Clear field');
    await act(async () => {
      fireEvent.click(clearItem);
    });

    expect(defaultProps.onRemove).toHaveBeenCalled();
  });

  it('calls toggleRawValueWrap when Raw is clicked', async () => {
    const wrapper = render(<FieldActions {...defaultProps} />);

    await act(async () => {
      fireEvent.click(wrapper.getByTestId('testProp__field-actions'));
    });

    const rawItem = wrapper.getByLabelText('Toggle RAW wrap for field');
    await act(async () => {
      fireEvent.click(rawItem);
    });

    expect(defaultProps.toggleRawValueWrap).toHaveBeenCalled();
  });

  it('removes Raw item if toggleRawValueWrap is not provided', async () => {
    const wrapper = render(<FieldActions {...defaultProps} toggleRawValueWrap={undefined} />);

    await act(async () => {
      fireEvent.click(wrapper.getByTestId('testProp__field-actions'));
    });

    const rawItem = wrapper.queryByTestId('testProp__toRaw');

    expect(rawItem).not.toBeInTheDocument();
  });

  it('sets correct and titles', async () => {
    const wrapper = render(<FieldActions {...defaultProps} />);

    await act(async () => {
      fireEvent.click(wrapper.getByTestId('testProp__field-actions'));
    });

    const clearItem = wrapper.getByTestId('testProp__clear');
    expect(clearItem).toHaveAttribute('title', 'Clear field');

    const rawItem = wrapper.getByTestId('testProp__toRaw');
    expect(rawItem).toHaveAttribute('title', 'Toggle RAW wrap for field');
  });
});
