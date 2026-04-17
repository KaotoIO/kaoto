import { Modal, ModalProps } from '@patternfly/react-core';
import { FunctionComponent, KeyboardEvent, MouseEvent, PointerEvent, TouchEvent, useCallback } from 'react';

/**
 * A wrapper around PatternFly Modal that prevents mouse/pointer/keyboard events
 * from propagating through the React tree to the DataMapper canvas DnD handlers.
 *
 * PatternFly Modal renders via a portal to document.body, but React synthetic
 * events still bubble through the React tree (not the DOM tree). Since DataMapper
 * modals are rendered as children of draggable components, events from the modal
 * would reach useDraggable listeners and trigger unintended drag operations.
 *
 * The wrapper div sits above the Modal in the React tree, so it intercepts
 * synthetic events from the entire portal — including the backdrop, modal box,
 * and all children. Inner draggable listeners (e.g., XPath editor's DnD) fire
 * before the event reaches this wrapper, so they are not affected.
 */
export const DataMapperModal: FunctionComponent<Omit<ModalProps, 'ref'>> = (props) => {
  const stopPropagation = useCallback((e: MouseEvent | PointerEvent | KeyboardEvent | TouchEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div // NOSONAR - intentional non-interactive event barrier for DnD isolation, not a user-facing element
      style={{ display: 'contents' }}
      onPointerDown={stopPropagation}
      onMouseDown={stopPropagation}
      onKeyDown={stopPropagation}
      onTouchStart={stopPropagation}
    >
      <Modal {...props} />
    </div>
  );
};
