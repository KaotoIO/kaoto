import { fireEvent, render, waitFor } from '@testing-library/react';
import { createVisualizationNode, IVisualizationNode } from '../../../../models';
import { ItemDeleteStep } from './ItemDeleteStep';
import {
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../../../../providers/action-confirmation-modal.provider';

describe('ItemDeleteStep', () => {
  const vizNode = createVisualizationNode('test', {});
  const mockVizNode = {
    removeChild: jest.fn(),
  } as unknown as IVisualizationNode;

  const mockDeleteModalContext = {
    actionConfirmation: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render delete ContextMenuItem', () => {
    const { container } = render(<ItemDeleteStep vizNode={vizNode} loadActionConfirmationModal={false} />);

    expect(container).toMatchSnapshot();
  });

  it('should open delete confirmation modal on click', async () => {
    const wrapper = render(
      <ActionConfirmationModalContext.Provider value={mockDeleteModalContext}>
        <ItemDeleteStep vizNode={vizNode} loadActionConfirmationModal={true} />
      </ActionConfirmationModalContext.Provider>,
    );

    fireEvent.click(wrapper.getByText('Delete'));

    expect(mockDeleteModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: 'Permanently delete step?',
      text: 'Step and its children will be lost.',
    });
  });

  it('should call removechild if deletion is confirmed', async () => {
    mockDeleteModalContext.actionConfirmation.mockResolvedValueOnce(ACTION_ID_CONFIRM);
    const wrapper = render(
      <ActionConfirmationModalContext.Provider value={mockDeleteModalContext}>
        <ItemDeleteStep vizNode={mockVizNode} loadActionConfirmationModal={true} />
      </ActionConfirmationModalContext.Provider>,
    );
    fireEvent.click(wrapper.getByText('Delete'));

    await waitFor(() => {
      expect(mockVizNode.removeChild).toHaveBeenCalled();
    });
  });
});
