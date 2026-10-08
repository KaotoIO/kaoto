import { Data, useDraggable, useDroppable } from '@dnd-kit/core';
import { act, fireEvent } from '@testing-library/react';
import { FunctionComponent } from 'react';

/**
 * Starts a real @dnd-kit pointer drag on the given drag handle (the `PointerSensor` needs a primary-button
 * `pointerdown`). JSDOM has no `PointerEvent`, so a `MouseEvent` named `pointerdown` stands in for it.
 * In JSDOM every element has an empty rect at (0, 0), which is also where this pointer is.
 */
export const firePrimaryPointerDown = (element: Element) => {
  const pointerDown = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
  Object.defineProperty(pointerDown, 'isPrimary', { value: true });
  fireEvent(element, pointerDown);
};

/**
 * Ends any pointer / mouse drag still in progress, then waits until @dnd-kit releases its document listeners.
 *
 * While a pointer or mouse drag is active, @dnd-kit swallows every `click` on the document (capture phase), and it
 * only removes that listener 50ms after the drag ends - not when the `DndContext` unmounts. A drag left running by
 * one test would therefore break clicks in every later test sharing the same JSDOM, so call this before a test ends
 * (or before clicking anything after a drop).
 */
export const endPointerDrag = async () => {
  fireEvent.pointerUp(document);
  fireEvent.mouseUp(document);
  await act(() => new Promise((resolve) => setTimeout(resolve, 60)));
};

/** A minimal real @dnd-kit draggable, rendered as a `<button>` drag handle labelled with its id. */
export const TestDraggable: FunctionComponent<{ id: string; data?: Data }> = ({ id, data }) => {
  const { attributes, listeners, setNodeRef } = useDraggable({ id, data });
  return (
    <button ref={setNodeRef} {...listeners} {...attributes}>
      {id}
    </button>
  );
};

/** A minimal real @dnd-kit droppable, labelled with its id. */
export const TestDroppable: FunctionComponent<{ id: string; data?: Data }> = ({ id, data }) => {
  const { setNodeRef } = useDroppable({ id, data });
  return <div ref={setNodeRef}>{id}</div>;
};
