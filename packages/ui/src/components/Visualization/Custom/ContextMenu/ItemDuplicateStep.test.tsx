import { fireEvent, render } from '@testing-library/react';

import { CatalogKind, createVisualizationNode } from '../../../../models';
import { EntityType } from '../../../../models/camel/entities';
import { useDuplicateStep } from '../hooks/duplicate-step.hook';
import { ItemDuplicateStep } from './ItemDuplicateStep';

// Mock the `useDuplicateStep` hook
jest.mock('../hooks/duplicate-step.hook', () => ({
  useDuplicateStep: jest.fn(),
}));

describe('ItemDuplicateStep', () => {
  const vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Entity, name: EntityType.Route });
  const mockOnDuplicate = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render Duplicate ContextMenuItem', () => {
    // Mock the `useDuplicateStep` hook to return compatible state
    (useDuplicateStep as jest.Mock).mockReturnValue({
      onDuplicate: mockOnDuplicate,
      canDuplicate: true,
    });

    const { container } = render(<ItemDuplicateStep vizNode={vizNode}>Duplicate</ItemDuplicateStep>);

    expect(container).toMatchSnapshot();
  });

  it('should not render Paste ContextMenuItem', () => {
    // Mock the `useDuplicateStep` hook to return compatible state
    (useDuplicateStep as jest.Mock).mockReturnValue({
      onDuplicate: mockOnDuplicate,
      canDuplicate: false,
    });

    const { container } = render(<ItemDuplicateStep vizNode={vizNode}>Duplicate</ItemDuplicateStep>);

    expect(container).toMatchSnapshot();
  });

  it('should call onDuplicate when the context menu item is clicked', () => {
    // Mock the `useDuplicateStep` hook to return compatible state
    (useDuplicateStep as jest.Mock).mockReturnValue({
      onDuplicate: mockOnDuplicate,
      canDuplicate: true,
    });

    const wrapper = render(<ItemDuplicateStep vizNode={vizNode}>Duplicate</ItemDuplicateStep>);
    fireEvent.click(wrapper.getByText('Duplicate'));

    expect(mockOnDuplicate).toHaveBeenCalledTimes(1);
  });
});
