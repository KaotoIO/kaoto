import { act, fireEvent, render } from '@testing-library/react';
import { ArrayFieldWrapper } from './ArrayFieldWrapper';

describe('ArrayFieldWrapper', () => {
  const defaultProps = {
    propName: 'testArray',
    type: 'array' as const,
    title: 'Test Array Field',
    description: 'A test array field',
    defaultValue: 'default value',
  };

  it('should render the ArrayFieldWrapper component', () => {
    const wrapper = render(<ArrayFieldWrapper {...defaultProps}>Test Children</ArrayFieldWrapper>);

    expect(wrapper.getByText('Test Array Field')).toBeInTheDocument();
    expect(wrapper.getByText('Test Children')).toBeInTheDocument();
  });

  it('should render the popover with correct content', async () => {
    const wrapper = render(<ArrayFieldWrapper {...defaultProps}>Test Children</ArrayFieldWrapper>);

    await act(async () => {
      const popoverTrigger = wrapper.getByLabelText(`More info for Test Array Field field`);
      fireEvent.mouseEnter(popoverTrigger);
    });

    expect(wrapper.getByText('Test Array Field <array>')).toBeInTheDocument();
    expect(wrapper.getByText('A test array field')).toBeInTheDocument();
    expect(wrapper.getByText('Default: default value')).toBeInTheDocument();
  });

  it('should render actions if provided', async () => {
    const wrapper = render(
      <ArrayFieldWrapper {...defaultProps} actions={<button>Action</button>}>
        Test Children
      </ArrayFieldWrapper>,
    );

    expect(wrapper.getByText('Action')).toBeInTheDocument();
  });

  it('should not render children if none are provided', async () => {
    const wrapper = render(<ArrayFieldWrapper {...defaultProps} />);

    expect(wrapper.queryByText('Test Children')).not.toBeInTheDocument();
  });

  it('should not render children if an empty array is provided', async () => {
    const wrapper = render(<ArrayFieldWrapper {...defaultProps}>{[].map(() => null)}</ArrayFieldWrapper>);

    expect(wrapper.queryByTestId('testArray__children')).not.toBeInTheDocument();
  });

  it('should render children if provided', async () => {
    const wrapper = render(<ArrayFieldWrapper {...defaultProps}>Test Children</ArrayFieldWrapper>);

    expect(wrapper.queryByTestId('testArray__children')).toBeInTheDocument();
  });
});
