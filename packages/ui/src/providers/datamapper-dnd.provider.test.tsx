import { AlertVariant } from '@patternfly/react-core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { createDataMapperContext, createDataMapperContextWrapper } from '../stubs/datamapper/data-mapper-context';
import { endPointerDrag, TestDraggable } from '../stubs/dnd-test-helpers';
import { canScrollPanel, DataMapperDndProvider, scrollAwareCollision } from './datamapper-dnd.provider';
import { DnDHandler } from './dnd/DnDHandler';

// Helper to create mock rect object
const createMockRect = (top: number, bottom: number, left: number, right: number) => ({
  top,
  bottom,
  left,
  right,
  width: right - left,
  height: bottom - top,
  x: left,
  y: top,
});

// Helper to create scroll container with getBoundingClientRect
const createScrollContainer = (rect: DOMRect): HTMLDivElement => {
  const container = document.createElement('div');
  container.getBoundingClientRect = () => rect;
  return container;
};

// Helper to create mock element with closest behavior
const createMockElement = (scrollContainerRect?: DOMRect | null): HTMLDivElement => {
  const element = document.createElement('div');

  element.closest = vi.fn((selector: string) => {
    if (selector === '.expansion-panel__content' && scrollContainerRect !== undefined) {
      if (scrollContainerRect === null) return null;
      return createScrollContainer(scrollContainerRect);
    }
    return null;
  });

  return element;
};

/** The rect of the dragged item: it overlaps every droppable rect used below, so `rectIntersection` reports them all */
const DRAGGED_RECT = createMockRect(0, 1000, 0, 1000);

/** A pointer position outside every droppable rect used below, so the `pointerWithin` fallback finds nothing */
const POINTER_OUTSIDE_DROPPABLES = { x: 900, y: 900 };

describe('datamapper-dnd.provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scrollAwareCollision', () => {
    it('should filter out droppables scrolled above visible area', () => {
      const droppableRect = createMockRect(50, 100, 0, 100); // Element position
      const containerRect = createMockRect(150, 400, 0, 500); // Scroll container (element is above)
      const mockElement = createMockElement(containerRect as DOMRect);

      const droppableRects = new Map([['droppable-1', droppableRect]]);
      const droppableContainer = {
        id: 'droppable-1',
        node: { current: mockElement },
        disabled: false,
      };

      const result = scrollAwareCollision({
        active: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['active'],
        collisionRect: DRAGGED_RECT,
        droppableRects,
        droppableContainers: [droppableContainer] as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: POINTER_OUTSIDE_DROPPABLES,
      });

      expect(result).toHaveLength(0);
    });

    it('should filter out droppables scrolled below visible area', () => {
      const droppableRect = createMockRect(450, 500, 0, 100); // Element position
      const containerRect = createMockRect(50, 400, 0, 500); // Scroll container (element is below)
      const mockElement = createMockElement(containerRect as DOMRect);

      const droppableRects = new Map([['droppable-1', droppableRect]]);
      const droppableContainer = {
        id: 'droppable-1',
        node: { current: mockElement },
        disabled: false,
      };

      const result = scrollAwareCollision({
        active: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['active'],
        collisionRect: DRAGGED_RECT,
        droppableRects,
        droppableContainers: [droppableContainer] as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: POINTER_OUTSIDE_DROPPABLES,
      });

      expect(result).toHaveLength(0);
    });

    it('should keep droppables visible within scroll container bounds', () => {
      const droppableRect = createMockRect(200, 250, 100, 200); // Element position
      const containerRect = createMockRect(150, 400, 50, 500); // Scroll container (element is visible)
      const mockElement = createMockElement(containerRect as DOMRect);

      const droppableRects = new Map([['droppable-1', droppableRect]]);
      const droppableContainer = {
        id: 'droppable-1',
        node: { current: mockElement },
        disabled: false,
      };

      const result = scrollAwareCollision({
        active: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['active'],
        collisionRect: DRAGGED_RECT,
        droppableRects,
        droppableContainers: [droppableContainer] as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: { x: 150, y: 225 },
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('droppable-1');
    });

    it('should keep droppables partially visible (overlapping top edge)', () => {
      const droppableRect = createMockRect(100, 200, 100, 200); // Partially visible (top half outside)
      const containerRect = createMockRect(150, 400, 50, 500); // Scroll container
      const mockElement = createMockElement(containerRect as DOMRect);

      const droppableRects = new Map([['droppable-1', droppableRect]]);
      const droppableContainer = {
        id: 'droppable-1',
        node: { current: mockElement },
        disabled: false,
      };

      const result = scrollAwareCollision({
        active: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['active'],
        collisionRect: DRAGGED_RECT,
        droppableRects,
        droppableContainers: [droppableContainer] as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: { x: 150, y: 175 },
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('droppable-1');
    });

    it('should keep droppables with no scroll container', () => {
      const droppableRect = createMockRect(200, 250, 100, 200);
      const mockElement = createMockElement(null); // No scroll container

      const droppableRects = new Map([['droppable-1', droppableRect]]);
      const droppableContainer = {
        id: 'droppable-1',
        node: { current: mockElement },
        disabled: false,
      };

      const result = scrollAwareCollision({
        active: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['active'],
        collisionRect: DRAGGED_RECT,
        droppableRects,
        droppableContainers: [droppableContainer] as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: { x: 150, y: 225 },
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('droppable-1');
    });

    it('should filter out droppables without rect', () => {
      const mockElement = createMockElement(null);

      const droppableRects = new Map(); // No rect for this droppable
      const droppableContainer = {
        id: 'droppable-1',
        node: { current: mockElement },
        disabled: false,
      };

      const result = scrollAwareCollision({
        active: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['active'],
        collisionRect: DRAGGED_RECT,
        droppableRects,
        droppableContainers: [droppableContainer] as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: { x: 150, y: 225 },
      });

      expect(result).toHaveLength(0);
    });

    it('should filter out droppables without DOM node', () => {
      const droppableRect = createMockRect(200, 250, 100, 200);

      const droppableRects = new Map([['droppable-1', droppableRect]]);
      const droppableContainer = {
        id: 'droppable-1',
        node: { current: null }, // No DOM element
        disabled: false,
      };

      const result = scrollAwareCollision({
        active: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['active'],
        collisionRect: DRAGGED_RECT,
        droppableRects,
        droppableContainers: [droppableContainer] as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: POINTER_OUTSIDE_DROPPABLES,
      });

      expect(result).toHaveLength(0);
    });

    it('should filter multiple droppables correctly', () => {
      const visibleRect = createMockRect(200, 250, 100, 200);
      const hiddenAboveRect = createMockRect(50, 100, 100, 200);
      const hiddenBelowRect = createMockRect(450, 500, 100, 200);
      const containerRect = createMockRect(150, 400, 50, 500);

      const visibleElement = createMockElement(containerRect as DOMRect);
      const hiddenAboveElement = createMockElement(containerRect as DOMRect);
      const hiddenBelowElement = createMockElement(containerRect as DOMRect);

      const droppableRects = new Map([
        ['visible', visibleRect],
        ['hidden-above', hiddenAboveRect],
        ['hidden-below', hiddenBelowRect],
      ]);

      const droppableContainers = [
        { id: 'visible', node: { current: visibleElement }, disabled: false },
        { id: 'hidden-above', node: { current: hiddenAboveElement }, disabled: false },
        { id: 'hidden-below', node: { current: hiddenBelowElement }, disabled: false },
      ];

      const result = scrollAwareCollision({
        active: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['active'],
        collisionRect: DRAGGED_RECT,
        droppableRects,
        droppableContainers: droppableContainers as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: { x: 150, y: 225 },
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('visible');
    });
  });

  describe('canScrollPanel', () => {
    const createMockElement = (panelId: string | null) => {
      const element = document.createElement('div');
      element.closest = vi.fn((selector: string) => {
        if (selector === '#panel-source' && panelId === 'panel-source') {
          return document.createElement('div');
        }
        if (selector === '#panel-target' && panelId === 'panel-target') {
          return document.createElement('div');
        }
        return null;
      });
      return element;
    };

    it('should allow scrolling when no active drag side', () => {
      const element = createMockElement('panel-source');
      const activeDragSideRef = { current: null };

      const result = canScrollPanel(element, activeDragSideRef);

      expect(result).toBe(true);
    });

    it.each([
      ['panel-target', 'source', true, 'target panel when dragging from source'],
      ['panel-source', 'source', false, 'source panel when dragging from source'],
      ['panel-source', 'target', true, 'source panel when dragging from target'],
      ['panel-target', 'target', false, 'target panel when dragging from target'],
    ])('should %s scrolling', (panelId, dragSide, expected, _desc) => {
      const element = createMockElement(panelId);
      const activeDragSideRef = { current: dragSide as 'source' | 'target' };

      const result = canScrollPanel(element, activeDragSideRef);

      expect(result).toBe(expected);
    });

    it('should block scrolling when element is not in any panel', () => {
      const element = createMockElement(null);
      const activeDragSideRef = { current: 'source' as const };

      const result = canScrollPanel(element, activeDragSideRef);

      expect(result).toBe(false);
    });
  });
});

describe('DataMapperDndProvider', () => {
  // Never leave a drag running: it would swallow the clicks of later tests (see endPointerDrag)
  afterEach(async () => {
    await endPointerDrag();
  });

  const mockSendAlert = vi.fn();
  const dataMapperContext = createDataMapperContext({ sendAlert: mockSendAlert });
  const wrapper = createDataMapperContextWrapper(dataMapperContext);

  const createHandler = (dragEndResult: ReturnType<DnDHandler['handleDragEnd']>) => ({
    handleDragStart: vi.fn<DnDHandler['handleDragStart']>(() => ({ success: true })),
    handleDragOver: vi.fn<DnDHandler['handleDragOver']>(),
    handleDragEnd: vi.fn<DnDHandler['handleDragEnd']>(() => dragEndResult),
  });

  const renderProvider = (handler: DnDHandler | undefined) =>
    render(
      <DataMapperDndProvider handler={handler}>
        <TestDraggable id="a" />
      </DataMapperDndProvider>,
      { wrapper },
    );

  /** Performs a real mouse drag & drop of the draggable (the provider's `MouseSensor` activates after 10px). */
  const dragAndDrop = async () => {
    fireEvent.mouseDown(screen.getByRole('button', { name: 'a' }), { button: 0, clientX: 0, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: 20, clientY: 0 });
    await waitFor(() => {
      expect(document.querySelector('[data-dnd-dragging]')).toBeInTheDocument();
    });
    fireEvent.mouseUp(document, { clientX: 20, clientY: 0 });
    await waitFor(() => {
      expect(document.querySelector('[data-dnd-dragging]')).not.toBeInTheDocument();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call sendAlert with danger variant when handler returns failure with error message', async () => {
    const handler = createHandler({ success: false, errorMessage: 'error msg' });
    renderProvider(handler);

    await dragAndDrop();

    expect(handler.handleDragEnd).toHaveBeenCalledWith(
      expect.objectContaining({ active: expect.objectContaining({ id: 'a' }) }),
      dataMapperContext.mappingTree,
      dataMapperContext.refreshMappingTree,
    );
    expect(mockSendAlert).toHaveBeenCalledWith({ variant: AlertVariant.danger, title: 'error msg' });
  });

  it('should not call sendAlert when handler returns success', async () => {
    const handler = createHandler({ success: true });
    renderProvider(handler);

    await dragAndDrop();

    expect(handler.handleDragEnd).toHaveBeenCalled();
    expect(mockSendAlert).not.toHaveBeenCalled();
  });

  it('should not crash when no handler is provided', async () => {
    renderProvider(undefined);

    await dragAndDrop();
    expect(mockSendAlert).not.toHaveBeenCalled();
  });
});
