import { Modal, ModalProps } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, PointerEvent, TouchEvent, useCallback } from 'react';

/**
 * A wrapper around PatternFly Modal that prevents click/pointer/mouse/touch
 * events from propagating through the React tree to the DataMapper canvas.
 *
 * PatternFly Modal renders via a portal to document.body, but React synthetic
 * events still bubble through the React tree (not the DOM tree). Since DataMapper
 * modals are rendered as children of draggable components, events from the modal
 * would reach useDraggable listeners and node selection handlers on the canvas.
 *
 * The wrapper div sits above the Modal in the React tree, so it intercepts
 * synthetic events from the entire portal — including the backdrop, modal box,
 * and all children. Inner draggable listeners (e.g., XPath editor's DnD) fire
 * before the event reaches this wrapper, so they are not affected.
 *
 * Keyboard events are intentionally NOT stopped. @dnd-kit's KeyboardSensor has
 * a built-in `event.target !== activator` guard that rejects events not originating
 * from the actual drag handle element. PF Modal's focus trap guarantees keyboard
 * focus stays inside the modal, so the canvas drag handle can never be the target.
 * Stopping keyboard propagation would break keyboard DnD (DragDropSort, XPathEditor)
 * inside modals, because dnd-kit's post-activation listeners on `document` need to
 * receive arrow/escape keys. PointerSensor/MouseSensor lack this target guard,
 * so pointer/mouse/touch isolation must remain.
 */
export const DataMapperModal: FunctionComponent<Omit<ModalProps, 'ref'>> = (props) => {
  const stopPropagation = useCallback((e: MouseEvent | PointerEvent | TouchEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div // NOSONAR - intentional non-interactive event barrier for DnD isolation, not a user-facing element
      style={{ display: 'contents' }}
      onClick={stopPropagation}
      onPointerDown={stopPropagation}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
    >
      <Modal {...props} />
    </div>
  );
};
