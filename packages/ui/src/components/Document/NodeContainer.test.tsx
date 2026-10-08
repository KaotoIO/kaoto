import { DndContext, pointerWithin, useDndContext } from '@dnd-kit/core';
import { render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { MappingTree } from '../../models/datamapper/mapping';
import { DocumentNodeData, TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { DataMapperDndContext } from '../../providers/datamapper-dnd.provider';
import { MappingValidationService } from '../../services/visualization/mapping-validation.service';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { endPointerDrag, firePrimaryPointerDown } from '../../stubs/dnd-test-helpers';
import { DraggableContainer, DroppableContainer } from './NodeContainer';

/** Shows whether the `droppable-test` droppable is registered as disabled in the surrounding real `DndContext`. */
const DroppableStateProbe: FunctionComponent = () => {
  const { droppableContainers } = useDndContext();
  return <span data-testid="droppable-disabled">{String(droppableContainers.get('droppable-test')?.disabled)}</span>;
};

/** A real `DndContext` whose collision detection picks the droppables under the pointer. */
const DndWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <DndContext collisionDetection={pointerWithin}>{children}</DndContext>
);

describe('DroppableContainer', () => {
  // Never leave a drag running: it would swallow the clicks of later tests (see endPointerDrag)
  afterEach(async () => {
    await endPointerDrag();
  });

  const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
  const mockNodeData = new TargetDocumentNodeData(TestUtil.createTargetOrderDoc(), mappingTree);
  const activeSourceNode = new DocumentNodeData(TestUtil.createSourceOrderDoc());

  beforeEach(() => {
    vi.spyOn(MappingValidationService, 'validateMappingPair').mockReturnValue({ isValid: true });
    vi.spyOn(MappingValidationService, 'isDraggable').mockReturnValue(true);
    vi.spyOn(MappingValidationService, 'isDroppable').mockReturnValue(true);
  });

  /** Renders the droppable next to a draggable source node and drags that source node over it. */
  const renderAndDragOverDroppable = async () => {
    const { container } = render(
      <DataMapperDndContext.Provider value={{ activeNode: activeSourceNode }}>
        <DroppableContainer id="test" nodeData={mockNodeData}>
          content
        </DroppableContainer>
        <DraggableContainer id="source" nodeData={activeSourceNode}>
          source
        </DraggableContainer>
      </DataMapperDndContext.Provider>,
      { wrapper: DndWrapper },
    );

    firePrimaryPointerDown(screen.getByText('source'));
    await waitFor(() => {
      expect(container.querySelector('[data-dnd-droppable="test"]')).toBeTruthy();
    });

    return container;
  };

  it('should call useDroppable with disabled: false when there is no active node', async () => {
    render(
      <DataMapperDndContext.Provider value={{}}>
        <DroppableContainer id="test" nodeData={mockNodeData}>
          content
        </DroppableContainer>
        <DroppableStateProbe />
      </DataMapperDndContext.Provider>,
      { wrapper: DndWrapper },
    );

    await waitFor(() => {
      expect(screen.getByTestId('droppable-disabled')).toHaveTextContent('false');
    });
  });

  it('should call useDroppable with disabled: true when isDroppable returns false', async () => {
    vi.spyOn(MappingValidationService, 'isDroppable').mockReturnValue(false);
    const sameSideNode = new TargetDocumentNodeData(TestUtil.createTargetOrderDoc(), mappingTree);
    render(
      <DataMapperDndContext.Provider value={{ activeNode: sameSideNode }}>
        <DroppableContainer id="test" nodeData={mockNodeData}>
          content
        </DroppableContainer>
        <DroppableStateProbe />
      </DataMapperDndContext.Provider>,
      { wrapper: DndWrapper },
    );

    await waitFor(() => {
      expect(screen.getByTestId('droppable-disabled')).toHaveTextContent('true');
    });
  });

  it('should apply droppable-invalid class when hovering over an invalid cross-side drop', async () => {
    vi.spyOn(MappingValidationService, 'validateMappingPair').mockReturnValue({ isValid: false });

    const container = await renderAndDragOverDroppable();

    expect(container.querySelector('.droppable-invalid')).toBeTruthy();
    expect(container.querySelector('.droppable-container')).toBeFalsy();
  });

  it('should apply droppable-container class when hovering over a valid cross-side drop', async () => {
    vi.spyOn(MappingValidationService, 'validateMappingPair').mockReturnValue({ isValid: true });

    const container = await renderAndDragOverDroppable();

    expect(container.querySelector('.droppable-container')).toBeTruthy();
    expect(container.querySelector('.droppable-invalid')).toBeFalsy();
  });
});
