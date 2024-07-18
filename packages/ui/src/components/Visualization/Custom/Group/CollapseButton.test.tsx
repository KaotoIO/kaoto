import { CollapsibleGroupProps } from '@patternfly/react-topology';
import { fireEvent } from '@testing-library/dom';
import { act, render } from '@testing-library/react';
import { CollapseButton } from './CollapseButton';
import { CustomGroupProps } from './Group.models';

describe('CollapseButton', () => {
  let element: CustomGroupProps['element'];
  let onCollapseChange: CollapsibleGroupProps['onCollapseChange'];

  beforeEach(() => {
    element = {
      getId: () => 'test',
      isCollapsed: () => false,
    } as unknown as CustomGroupProps['element'];
    onCollapseChange = jest.fn();
  });

  it('should render the collapse button', () => {
    const wrapper = render(
      <CollapseButton data-testid="collapseButton-test" element={element} onCollapseChange={onCollapseChange} />,
    );
    const button = wrapper.getByTestId('collapseButton-test');

    expect(button).toBeInTheDocument();
    expect(button).toMatchSnapshot();
  });

  it('should render the collapse icon', () => {
    const wrapper = render(<CollapseButton element={element} onCollapseChange={onCollapseChange} />);
    const icon = wrapper.getByTestId('collapse-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should render the expand icon', () => {
    element.isCollapsed = () => true;

    const wrapper = render(<CollapseButton element={element} onCollapseChange={onCollapseChange} />);
    const icon = wrapper.getByTestId('expand-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should call onCollapseChange when the button is clicked', () => {
    const wrapper = render(
      <CollapseButton data-testid="collapseButton-test" element={element} onCollapseChange={onCollapseChange} />,
    );
    const button = wrapper.getByTestId('collapseButton-test');

    act(() => {
      fireEvent.click(button);
    });

    expect(onCollapseChange).toHaveBeenCalledWith(element, true);
  });
});
