import './datamapper-dnd.provider.scss';

import {
  CollisionDetection,
  DataRef,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Label } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react';

import { useDataMapper } from '../hooks/useDataMapper';
import { NodeData } from '../models/datamapper';
import { DnDHandler } from './dnd/DnDHandler';

/**
 * @dnd-kit's auto-scroll is not suitable for multiple overlapping scroll panels.
 *
 * PROBLEM:
 * - @dnd-kit's getScrollableAncestors() finds ALL scrollable containers in the DOM
 * - It auto-scrolls ANY container where the pointer gets near the edge
 * - No built-in check to verify if the container is relevant to the current drag
 * - With ExpansionPanels: multiple resizable/collapsible scroll containers overlap vertically
 * - When panels resize/collapse, droppables remain in DOM but aren't visible
 * - @dnd-kit detects these invisible droppables and scrolls unrelated panels
 *
 * SOLUTION:
 * 1. scrollAwareCollision: Custom collision detection that filters out droppables
 *    outside their scroll container's visible bounds
 * 2. canScroll callback: Restricts auto-scroll to only destination-side panels
 *    (opposite from drag source)
 */

/**
 * Scroll-aware collision detection that filters out droppables outside their scroll container's visible bounds.
 * This prevents @dnd-kit from auto-scrolling panels when droppables are detected but not actually visible.
 * @internal Exported for testing purposes
 */
export const scrollAwareCollision: CollisionDetection = (args) => {
  // Use rectIntersection as primary - it's more reliable with synthetic events (e.g., Cypress)
  // pointerWithin requires accurate pointer coordinates which synthetic events may not provide
  let collisions = rectIntersection(args);

  // Filter out droppables that are scrolled outside their container's visible area
  collisions = collisions.filter((collision) => {
    const droppableId = collision.id;
    const rect = args.droppableRects.get(droppableId);
    if (!rect) return false;

    // Find the droppable's DOM element
    const droppableContainer = args.droppableContainers.find((c) => c.id === droppableId);
    const droppableElement = droppableContainer?.node.current;
    if (!droppableElement) return false;

    // Find the scroll container (.expansion-panel__content)
    const scrollContainer = droppableElement.closest('.expansion-panel__content');
    if (!scrollContainer) return true; // No scroll container = visible

    // Check if droppable is within scroll container's visible bounds
    const containerRect = scrollContainer.getBoundingClientRect();

    // Element must be at least partially visible within scroll container
    return (
      rect.bottom > containerRect.top &&
      rect.top < containerRect.bottom &&
      rect.right > containerRect.left &&
      rect.left < containerRect.right
    );
  });

  // Fallback to pointerWithin if no rect collisions (for precise pointer-based selection)
  if (collisions.length === 0) {
    collisions = pointerWithin(args);
  }

  return collisions;
};

/**
 * Determines if a scroll container should be allowed to auto-scroll during drag operations.
 * Only allows scrolling destination-side panels (opposite from drag source).
 * @internal Exported for testing purposes
 */
export const canScrollPanel = (
  element: Element,
  activeDragSideRef: { current: 'source' | 'target' | null },
): boolean => {
  if (!activeDragSideRef.current) return true;

  // Determine which side this scroll container belongs to
  const sourcePanel = element.closest('#panel-source');
  const targetPanel = element.closest('#panel-target');

  let elementSide: 'source' | 'target' | null = null;
  if (sourcePanel) {
    elementSide = 'source';
  } else if (targetPanel) {
    elementSide = 'target';
  }

  // Dragging FROM source → ONLY scroll target panels (destination)
  // Dragging FROM target → ONLY scroll source panels (destination)
  const destinationSide = activeDragSideRef.current === 'source' ? 'target' : 'source';
  return elementSide === destinationSide;
};

export interface IDataMapperDndContext {
  handler?: DnDHandler;
}

export const DataMapperDndContext = createContext<IDataMapperDndContext>({});

type DataMapperDndContextProps = PropsWithChildren & {
  handler: DnDHandler | undefined;
};

export const DatamapperDndProvider: FunctionComponent<DataMapperDndContextProps> = (props) => {
  const { mappingTree, refreshMappingTree } = useDataMapper();
  const [activeData, setActiveData] = useState<DataRef<NodeData> | null>(null);
  const activeDragSideRef = useRef<'source' | 'target' | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      props.handler && props.handler.handleDragStart(event);
      setActiveData(event.active.data as DataRef<NodeData>);

      // Determine which side we're dragging FROM using the node data
      const nodeData = (event.active.data as DataRef<NodeData>)?.current;
      if (nodeData) {
        activeDragSideRef.current = nodeData.isSource ? 'source' : 'target';
      }
    },
    [props.handler],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      props.handler && props.handler.handleDragOver(event);
    },
    [props.handler],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      props.handler && props.handler.handleDragEnd(event, mappingTree, refreshMappingTree);
      setActiveData(null);
      activeDragSideRef.current = null;
    },
    [mappingTree, props.handler, refreshMappingTree],
  );

  const handler = useMemo(() => {
    return {
      handler: props.handler,
    };
  }, [props.handler]);

  const draggingLabel = activeData?.current?.title ? activeData.current.title : 'dragging...';
  return (
    <DataMapperDndContext.Provider value={handler}>
      <DndContext
        sensors={sensors}
        collisionDetection={scrollAwareCollision}
        autoScroll={{
          enabled: true,
          layoutShiftCompensation: false,
          // Only allow scrolling DESTINATION panels (opposite side from drag source)
          canScroll: (element) => canScrollPanel(element, activeDragSideRef),
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {props.children}
        <DragOverlay dropAnimation={null}>
          <div className={'pf-v6-c-draggable node__row dragging-container'} data-dnd-dragging={draggingLabel}>
            <Label>{draggingLabel}</Label>
          </div>
        </DragOverlay>
      </DndContext>
    </DataMapperDndContext.Provider>
  );
};
