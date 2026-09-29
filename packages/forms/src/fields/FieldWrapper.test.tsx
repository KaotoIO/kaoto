import { act, fireEvent, render } from '@testing-library/react';
import { FieldWrapper } from './FieldWrapper';

describe('FieldWrapper', () => {
  const defaultProps = {
    propName: 'test',
    type: 'string',
    title: 'Test Field',
    description: 'A test field',
    defaultValue: 'default value',
  };

  it('should render the FieldWrapper component', () => {
    const wrapper = render(<FieldWrapper {...defaultProps}>Test Children</FieldWrapper>);

    expect(wrapper.getByText('Test Field')).toBeInTheDocument();
    expect(wrapper.getByText('Test Children')).toBeInTheDocument();
  });

  it('should use the last portion of the property name as label if a label was not provided', () => {
    const propName = '#.expression.csimple';
    const wrapper = render(
      <FieldWrapper {...defaultProps} propName={propName} title={undefined}>
        Test Children
      </FieldWrapper>,
    );

    expect(wrapper.getByText('csimple')).toBeInTheDocument();
  });

  it('should render the toggletip with correct content', async () => {
    const wrapper = render(<FieldWrapper {...defaultProps}>Test Children</FieldWrapper>);

    await act(async () => {
      const toggletipButton = wrapper.getByLabelText(`More info for Test Field field`);
      fireEvent.click(toggletipButton);
    });

    expect(wrapper.getByText('Test Field <string>')).toBeInTheDocument();
    expect(wrapper.getByText('A test field')).toBeInTheDocument();
    expect(wrapper.getByText('Default: default value')).toBeInTheDocument();
  });

  it('should show errors if they are provided', () => {
    const wrapper = render(
      <FieldWrapper {...defaultProps} errors={['error message']}>
        Test Children
      </FieldWrapper>,
    );

    expect(wrapper.getByText('error message')).toBeInTheDocument();
  });

  it('displays raw badge when isRaw is true', () => {
    const wrapper = render(
      <FieldWrapper {...defaultProps} isRaw>
        Test Children
      </FieldWrapper>,
    );

    expect(wrapper.getByText('raw')).toBeInTheDocument();
  });

  it('does not display raw badge when isRaw is false', () => {
    const wrapper = render(
      <FieldWrapper {...defaultProps} isRaw={false}>
        Test Children
      </FieldWrapper>,
    );

    expect(wrapper.queryByText('raw')).not.toBeInTheDocument();
  });
});
