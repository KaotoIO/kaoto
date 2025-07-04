import { fireEvent, render } from '@testing-library/react';
import { createVisualizationNode } from '../../../../models';
import { ItemCopyStep } from './ItemCopyStep';
import { useCopyStep } from '../hooks/copy-step.hook';

// Mock the `useCopyStep` hook
jest.mock('../hooks/copy-step.hook', () => ({
  useCopyStep: jest.fn(),
}));

describe('ItemCopyStep', () => {
  const vizNode = createVisualizationNode('test', {});
  const mockOnCopyStep = jest.fn();
  beforeEach(() => {
    // Mock the `useCopyStep` hook to return the `onCopyStep` function
    (useCopyStep as jest.Mock).mockReturnValue({
      onCopyStep: mockOnCopyStep,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render Copy ContextMenuItem', () => {
    const { container } = render(<ItemCopyStep vizNode={vizNode} />);

    expect(container).toMatchSnapshot();
  });

  it('should call onCopyStep when the context menu item is clicked', () => {
    const wrapper = render(<ItemCopyStep vizNode={vizNode} />);
    fireEvent.click(wrapper.getByText('Copy'));

    expect(mockOnCopyStep).toHaveBeenCalledTimes(1);
  });
});
