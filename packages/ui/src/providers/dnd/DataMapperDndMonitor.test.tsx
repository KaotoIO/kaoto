import { DndContext, pointerWithin } from '@dnd-kit/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MockInstance } from 'vitest';

import { endPointerDrag, firePrimaryPointerDown, TestDraggable, TestDroppable } from '../../stubs/dnd-test-helpers';
import { DataMapperDnDMonitor } from './DataMapperDndMonitor';

describe('DataMapperDnDMonitor', () => {
  let consoleSpy: MockInstance<typeof console.debug>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Never leave a drag running: it would swallow the clicks of later tests (see endPointerDrag)
    await endPointerDrag();
    consoleSpy.mockRestore();
  });

  /** Renders the monitor inside a real `DndContext`, next to a draggable source node and a droppable target node. */
  const renderMonitor = () =>
    render(
      <DndContext collisionDetection={pointerWithin}>
        <TestDraggable id="source" data={{ path: 'source/path' }} />
        <TestDroppable id="target" data={{ path: 'target/path' }} />
        <DataMapperDnDMonitor />
      </DndContext>,
    );

  /** Starts dragging the source node; in JSDOM it is immediately over the target node (all rects are empty). */
  const startDrag = () => {
    firePrimaryPointerDown(screen.getByRole('button', { name: 'source' }));
  };

  it('should register dnd event handlers', () => {
    renderMonitor();
    expect(consoleSpy).not.toHaveBeenCalled();

    startDrag();

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log on drag start', () => {
    renderMonitor();
    startDrag();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('onDragStart'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('active: source/path'));
  });

  it('should log on drag over', async () => {
    renderMonitor();
    startDrag();
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('onDragOver'));
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('over:target/path'));
  });

  it('should log on drag end', async () => {
    renderMonitor();
    startDrag();
    fireEvent.pointerUp(document);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('onDragEnd'));
    });
  });

  it('should log on drag cancel', async () => {
    renderMonitor();
    startDrag();
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('onDragCancel'));
    });
  });
});
