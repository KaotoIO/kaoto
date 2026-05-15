import { ModalVariant } from '@patternfly/react-core';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  FunctionComponent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  PropsWithChildren,
  TouchEvent,
  useCallback,
} from 'react';

import { DataMapperModal } from './DataMapperModal';

/**
 * Test helper that simulates a DnD-aware parent component.
 * Uses a native interactive element (button) to capture events
 * that would normally reach @dnd-kit's useDraggable listeners.
 */
const DnDParent: FunctionComponent<
  PropsWithChildren<{
    onClick?: (e: MouseEvent) => void;
    onMouseDown?: (e: MouseEvent) => void;
    onPointerDown?: (e: PointerEvent) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    onTouchStart?: (e: TouchEvent) => void;
  }>
> = ({ children, ...handlers }) => {
  useCallback(() => {}, []);
  return (
    <div style={{ all: 'unset' }} {...handlers}>
      {children}
    </div>
  );
};

describe('DataMapperModal', () => {
  it('should render children inside the modal', () => {
    render(
      <DataMapperModal isOpen data-testid="test-modal" aria-label="Test Modal">
        <button data-testid="modal-content">Content</button>
      </DataMapperModal>,
    );
    expect(screen.getByTestId('modal-content')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(
      <DataMapperModal isOpen={false} aria-label="Test Modal">
        <button data-testid="modal-content">Content</button>
      </DataMapperModal>,
    );
    expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
  });

  it('should stop click propagation to parent handlers', () => {
    const outerHandler = jest.fn();
    render(
      <DnDParent onClick={outerHandler}>
        <DataMapperModal isOpen aria-label="Test Modal">
          <button data-testid="inner-btn">Click me</button>
        </DataMapperModal>
      </DnDParent>,
    );

    fireEvent.click(screen.getByTestId('inner-btn'));
    expect(outerHandler).not.toHaveBeenCalled();
  });

  it('should stop mousedown propagation to parent DnD handlers', () => {
    const outerHandler = jest.fn();
    render(
      <DnDParent onMouseDown={outerHandler}>
        <DataMapperModal isOpen aria-label="Test Modal">
          <button data-testid="inner-btn">Click me</button>
        </DataMapperModal>
      </DnDParent>,
    );

    fireEvent.mouseDown(screen.getByTestId('inner-btn'));
    expect(outerHandler).not.toHaveBeenCalled();
  });

  it('should stop pointerdown propagation to parent DnD handlers', () => {
    const outerHandler = jest.fn();
    render(
      <DnDParent onPointerDown={outerHandler}>
        <DataMapperModal isOpen aria-label="Test Modal">
          <button data-testid="inner-btn">Click me</button>
        </DataMapperModal>
      </DnDParent>,
    );

    fireEvent.pointerDown(screen.getByTestId('inner-btn'));
    expect(outerHandler).not.toHaveBeenCalled();
  });

  it('should allow keydown events to propagate for keyboard DnD support', () => {
    const outerHandler = jest.fn();
    render(
      <DnDParent onKeyDown={outerHandler}>
        <DataMapperModal isOpen aria-label="Test Modal">
          <input data-testid="inner-input" />
        </DataMapperModal>
      </DnDParent>,
    );

    fireEvent.keyDown(screen.getByTestId('inner-input'), { key: 'Enter' });
    expect(outerHandler).toHaveBeenCalled();
  });

  it('should stop touchstart propagation to parent DnD handlers', () => {
    const outerHandler = jest.fn();
    render(
      <DnDParent onTouchStart={outerHandler}>
        <DataMapperModal isOpen aria-label="Test Modal">
          <button data-testid="inner-btn">Click me</button>
        </DataMapperModal>
      </DnDParent>,
    );

    fireEvent.touchStart(screen.getByTestId('inner-btn'));
    expect(outerHandler).not.toHaveBeenCalled();
  });

  it('should still allow interaction with inner elements', () => {
    const innerClickHandler = jest.fn();
    render(
      <DataMapperModal isOpen aria-label="Test Modal">
        <button data-testid="inner-btn" onClick={innerClickHandler}>
          Click me
        </button>
      </DataMapperModal>,
    );

    fireEvent.click(screen.getByTestId('inner-btn'));
    expect(innerClickHandler).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when the modal close mechanism is triggered', () => {
    const onClose = jest.fn();
    render(
      <DataMapperModal isOpen onClose={onClose} aria-label="Test Modal">
        <button>Content</button>
      </DataMapperModal>,
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should pass through modal props to underlying Modal', () => {
    render(
      <DataMapperModal isOpen aria-label="Custom Label" data-testid="custom-modal" variant={ModalVariant.small}>
        <button>Content</button>
      </DataMapperModal>,
    );

    const modalBox = screen.getByRole('dialog');
    expect(modalBox).toHaveAttribute('aria-label', 'Custom Label');
  });
});
