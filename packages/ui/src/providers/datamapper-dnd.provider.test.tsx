import { canScrollPanel, scrollAwareCollision } from './datamapper-dnd.provider';

// Mock rectIntersection to control collision detection in tests
jest.mock('@dnd-kit/core', () => {
  const actual = jest.requireActual('@dnd-kit/core');
  return {
    ...actual,
    rectIntersection: jest.fn((args: { droppableContainers: Array<{ id: string }> }) => {
      // Return all droppables as potential collisions (let the filtering handle it)
      return Array.from(args.droppableContainers).map((container) => ({
        id: container.id,
        data: { droppableContainer: container, value: 55.9017 },
      }));
    }),
    pointerWithin: jest.fn(() => []),
  };
});

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

  element.closest = jest.fn((selector: string) => {
    if (selector === '.expansion-panel__content' && scrollContainerRect !== undefined) {
      if (scrollContainerRect === null) return null;
      return createScrollContainer(scrollContainerRect);
    }
    return null;
  });

  return element;
};

describe('datamapper-dnd.provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        collisionRect: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['collisionRect'],
        droppableRects,
        droppableContainers: [droppableContainer] as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: { x: 50, y: 75 },
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
        collisionRect: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['collisionRect'],
        droppableRects,
        droppableContainers: [droppableContainer] as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: { x: 50, y: 475 },
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
        collisionRect: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['collisionRect'],
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
        collisionRect: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['collisionRect'],
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
        collisionRect: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['collisionRect'],
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
        collisionRect: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['collisionRect'],
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
        collisionRect: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['collisionRect'],
        droppableRects,
        droppableContainers: [droppableContainer] as unknown as Parameters<
          typeof scrollAwareCollision
        >[0]['droppableContainers'],
        pointerCoordinates: { x: 150, y: 225 },
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
        collisionRect: {} as unknown as Parameters<typeof scrollAwareCollision>[0]['collisionRect'],
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
      element.closest = jest.fn((selector: string) => {
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

    it('should allow scrolling target panel when dragging from source', () => {
      const element = createMockElement('panel-target');
      const activeDragSideRef = { current: 'source' as const };

      const result = canScrollPanel(element, activeDragSideRef);

      expect(result).toBe(true);
    });

    it('should block scrolling source panel when dragging from source', () => {
      const element = createMockElement('panel-source');
      const activeDragSideRef = { current: 'source' as const };

      const result = canScrollPanel(element, activeDragSideRef);

      expect(result).toBe(false);
    });

    it('should allow scrolling source panel when dragging from target', () => {
      const element = createMockElement('panel-source');
      const activeDragSideRef = { current: 'target' as const };

      const result = canScrollPanel(element, activeDragSideRef);

      expect(result).toBe(true);
    });

    it('should block scrolling target panel when dragging from target', () => {
      const element = createMockElement('panel-target');
      const activeDragSideRef = { current: 'target' as const };

      const result = canScrollPanel(element, activeDragSideRef);

      expect(result).toBe(false);
    });

    it('should block scrolling when element is not in any panel', () => {
      const element = createMockElement(null);
      const activeDragSideRef = { current: 'source' as const };

      const result = canScrollPanel(element, activeDragSideRef);

      expect(result).toBe(false);
    });
  });
});
