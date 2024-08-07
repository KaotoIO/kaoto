import { fireEvent } from '@testing-library/dom';
import { act, render } from '@testing-library/react';
import { ContextMenuButton } from './ContextMenuButton';
import { CustomGroupProps } from './Group.models';

describe('ContextMenuButton', () => {
  let element: CustomGroupProps['element'];

  beforeEach(() => {
    element = {
      getId: () => 'test',
      getData: () => undefined,
    } as unknown as CustomGroupProps['element'];
  });

  it('should render the button', () => {
    const wrapper = render(<ContextMenuButton element={element} />);
    const button = wrapper.getByTestId('contextualMenu-test');

    expect(button).toBeInTheDocument();
    expect(button).toMatchSnapshot();
  });

  it('should open the context menu when the button is clicked', () => {
    const wrapper = render(<ContextMenuButton element={element} />);
    const button = wrapper.getByTestId('contextualMenu-test');

    act(() => {
      fireEvent.click(button);
    });

    const contextMenu = wrapper.getByTestId('node-context-menu');

    expect(contextMenu).toBeInTheDocument();
  });

  it('should close the context menu when the button is clicked twice', () => {
    const wrapper = render(<ContextMenuButton element={element} />);
    const button = wrapper.getByTestId('contextualMenu-test');

    fireEvent.click(button);
    fireEvent.click(button);

    const contextMenu = wrapper.queryByTestId('node-context-menu');

    expect(contextMenu).not.toBeInTheDocument();
  });
});
