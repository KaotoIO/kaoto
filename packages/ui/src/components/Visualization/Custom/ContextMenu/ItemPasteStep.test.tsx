import { fireEvent, render } from '@testing-library/react';
import type { Mock } from 'vitest';

import { AddStepMode, createVisualizationNode } from '../../../../models';
import { EntityType } from '../../../../models/entities';
import { usePasteStep } from '../hooks/paste-step.hook';
import { ItemPasteStep } from './ItemPasteStep';

// Mock the `usePasteStep` hook
vi.mock('../hooks/paste-step.hook', () => ({
  usePasteStep: vi.fn(),
}));

describe('ItemPasteStep', () => {
  const vizNode = createVisualizationNode('test', {
    name: EntityType.Route,
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
  });
  const mockOnPasteStep = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render Paste ContextMenuItem', () => {
    // Mock the `usePasteStep` hook to return compatible state
    (usePasteStep as Mock).mockReturnValue({
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
    (usePasteStep as Mock).mockReturnValue({
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
    (usePasteStep as Mock).mockReturnValue({
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
