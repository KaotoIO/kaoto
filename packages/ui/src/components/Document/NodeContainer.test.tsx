import { useDroppable } from '@dnd-kit/core';
import { render } from '@testing-library/react';

import { NodeData } from '../../models/datamapper/visualization';
import { DataMapperDndContext } from '../../providers/datamapper-dnd.provider';
import { MappingValidationService } from '../../services/mapping-validation.service';
import { DroppableContainer } from './NodeContainer';

jest.mock('@dnd-kit/core', () => ({
  useDroppable: jest.fn().mockReturnValue({ isOver: false, setNodeRef: jest.fn() }),
  useDraggable: jest.fn().mockReturnValue({
    isDragging: false,
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
  }),
}));

jest.mock('../../services/mapping-validation.service', () => ({
  MappingValidationService: {
    validateMappingPair: jest.fn().mockReturnValue({ isValid: true }),
    isDraggable: jest.fn().mockReturnValue(true),
    isDroppable: jest.fn().mockReturnValue(true),
  },
}));

describe('DroppableContainer', () => {
  const mockNodeData = {
    id: 'test-node',
    title: 'Test Node',
    isSource: false,
    isPrimitive: false,
    path: {},
  } as unknown as NodeData;

  const activeSourceNode = {
    id: 'active-source',
    title: 'Active Source',
    isSource: true,
    isPrimitive: false,
    path: {},
  } as unknown as NodeData;

  beforeEach(() => {
    (useDroppable as jest.Mock).mockReturnValue({ isOver: false, setNodeRef: jest.fn() });
    (MappingValidationService.validateMappingPair as jest.Mock).mockReturnValue({ isValid: true });
    (MappingValidationService.isDraggable as jest.Mock).mockReturnValue(true);
    (MappingValidationService.isDroppable as jest.Mock).mockReturnValue(true);
  });

  it('should call useDroppable with disabled: false when there is no active node', () => {
    render(
      <DataMapperDndContext.Provider value={{}}>
        <DroppableContainer id="test" nodeData={mockNodeData}>
          content
        </DroppableContainer>
      </DataMapperDndContext.Provider>,
    );
    expect(useDroppable).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
  });

  it('should call useDroppable with disabled: true when isDroppable returns false', () => {
    (MappingValidationService.isDroppable as jest.Mock).mockReturnValue(false);
    const sameSideNode = { ...mockNodeData, id: 'same-side', isSource: false } as unknown as NodeData;
    render(
      <DataMapperDndContext.Provider value={{ activeNode: sameSideNode }}>
        <DroppableContainer id="test" nodeData={mockNodeData}>
          content
        </DroppableContainer>
      </DataMapperDndContext.Provider>,
    );
    expect(useDroppable).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
  });

  it('should apply droppable-invalid class when hovering over an invalid cross-side drop', () => {
    (MappingValidationService.validateMappingPair as jest.Mock).mockReturnValue({ isValid: false });
    (useDroppable as jest.Mock).mockReturnValue({ isOver: true, setNodeRef: jest.fn() });

    const { container } = render(
      <DataMapperDndContext.Provider value={{ activeNode: activeSourceNode }}>
        <DroppableContainer id="test" nodeData={mockNodeData}>
          content
        </DroppableContainer>
      </DataMapperDndContext.Provider>,
    );

    expect(container.querySelector('.droppable-invalid')).toBeTruthy();
    expect(container.querySelector('.droppable-container')).toBeFalsy();
  });

  it('should apply droppable-container class when hovering over a valid cross-side drop', () => {
    (MappingValidationService.validateMappingPair as jest.Mock).mockReturnValue({ isValid: true });
    (useDroppable as jest.Mock).mockReturnValue({ isOver: true, setNodeRef: jest.fn() });

    const { container } = render(
      <DataMapperDndContext.Provider value={{ activeNode: activeSourceNode }}>
        <DroppableContainer id="test" nodeData={mockNodeData}>
          content
        </DroppableContainer>
      </DataMapperDndContext.Provider>,
    );

    expect(container.querySelector('.droppable-container')).toBeTruthy();
    expect(container.querySelector('.droppable-invalid')).toBeFalsy();
  });
});
