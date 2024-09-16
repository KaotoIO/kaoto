import { fireEvent, render } from '@testing-library/react';
import { createVisualizationNode } from '../../../../models';
import { ActionConfirmationModalContext } from '../../../../providers/action-confirmation-modal.provider';
import { ItemDeleteGroup } from './ItemDeleteGroup';

describe('ItemDeleteGroup', () => {
  const vizNode = createVisualizationNode('test', {});

  const mockDeleteModalContext = {
    actionConfirmation: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render delete ContextMenuItem', () => {
    const { container } = render(<ItemDeleteGroup vizNode={vizNode} />);

    expect(container).toMatchSnapshot();
  });

  it('should open delete confirmation modal on click', async () => {
    const wrapper = render(
      <ActionConfirmationModalContext.Provider value={mockDeleteModalContext}>
        <ItemDeleteGroup vizNode={vizNode} />
      </ActionConfirmationModalContext.Provider>,
    );

    fireEvent.click(wrapper.getByText('Delete'));

    expect(mockDeleteModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: 'Permanently delete flow?',
      text: 'All steps will be lost.',
    });
  });
});
