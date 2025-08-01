import { fireEvent, render } from '@testing-library/react';
import { AddStepMode, createVisualizationNode } from '../../../../models';
import { ItemPasteStep } from './ItemPasteStep';
import { usePasteStep } from '../hooks/paste-step.hook';

// Mock the `usePasteStep` hook
jest.mock('../hooks/paste-step.hook', () => ({
  usePasteStep: jest.fn(),
}));

describe('ItemPasteStep', () => {
  const vizNode = createVisualizationNode('test', {});
  const mockOnPasteStep = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render Paste ContextMenuItem', () => {
    // Mock the `usePasteStep` hook to return compatible state
    (usePasteStep as jest.Mock).mockReturnValue({
      onPasteStep: mockOnPasteStep,
      isCompatible: true,
    });

    const { container } = render(
      <ItemPasteStep vizNode={vizNode} mode={AddStepMode.AppendStep} text="Paste as child" />,
    );

    expect(container).toMatchSnapshot();
  });

  it('should not render Paste ContextMenuItem', () => {
    // Mock the `usePasteStep` hook to return compatible state
    (usePasteStep as jest.Mock).mockReturnValue({
      onPasteStep: mockOnPasteStep,
      isCompatible: false,
    });

    const { container } = render(
      <ItemPasteStep vizNode={vizNode} mode={AddStepMode.AppendStep} text="Paste as child" />,
    );

    expect(container).toMatchSnapshot();
  });

  it('should call onPasteStep when the context menu item is clicked', () => {
    // Mock the `usePasteStep` hook to return compatible state
    (usePasteStep as jest.Mock).mockReturnValue({
      onPasteStep: mockOnPasteStep,
      isCompatible: true,
    });

    const wrapper = render(
      <ItemPasteStep vizNode={vizNode} mode={AddStepMode.InsertChildStep} text="Paste as child" />,
    );
    fireEvent.click(wrapper.getByText('Paste as child'));

    expect(mockOnPasteStep).toHaveBeenCalledTimes(1);
  });
});
