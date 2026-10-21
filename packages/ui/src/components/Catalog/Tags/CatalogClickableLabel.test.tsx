import { fireEvent, render, screen } from '@testing-library/react';

import { CatalogClickableLabel } from './CatalogClickableLabel';

describe('CatalogClickableLabel', () => {
  it('should render a compact clickable label with the content inside a native button', () => {
    const { container } = render(
      <CatalogClickableLabel data-testid="label" onClick={vi.fn()}>
        http
      </CatalogClickableLabel>,
    );

    const button = screen.getByTestId('label');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('pf-v6-c-label__content');
    expect(button).toHaveTextContent('http');

    const label = container.querySelector('.pf-v6-c-label');
    expect(label).toHaveClass('pf-m-compact', 'pf-m-clickable', 'pf-m-filled');
  });

  it('should apply the color, variant and icon', () => {
    const { container } = render(
      <CatalogClickableLabel
        color="blue"
        variant="outline"
        icon={<img data-testid="icon" alt="" />}
        data-testid="label"
        onClick={vi.fn()}
      >
        timer
      </CatalogClickableLabel>,
    );

    const label = container.querySelector('.pf-v6-c-label');
    expect(label).toHaveClass('pf-m-blue', 'pf-m-outline');
    expect(label).not.toHaveClass('pf-m-filled');
    expect(screen.getByTestId('label')).toContainElement(screen.getByTestId('icon'));
  });

  it('should append buttonClassName to the PatternFly button classes', () => {
    render(
      <CatalogClickableLabel buttonClassName="custom-class" data-testid="label" onClick={vi.fn()}>
        timer
      </CatalogClickableLabel>,
    );

    expect(screen.getByTestId('label')).toHaveClass('pf-v6-c-label__content', 'custom-class');
  });

  it('should call onClick and let the event propagate by default', () => {
    const onClick = vi.fn();
    const parentClickHandler = vi.fn();
    render(
      <div onClick={parentClickHandler}>
        <CatalogClickableLabel data-testid="label" onClick={onClick}>
          timer
        </CatalogClickableLabel>
      </div>,
    );

    fireEvent.click(screen.getByTestId('label'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(parentClickHandler).toHaveBeenCalledTimes(1);
  });

  it('should call onMouseDown when provided', () => {
    const onMouseDown = vi.fn();
    render(
      <CatalogClickableLabel data-testid="label" onClick={vi.fn()} onMouseDown={onMouseDown}>
        timer
      </CatalogClickableLabel>,
    );

    fireEvent.mouseDown(screen.getByTestId('label'));

    expect(onMouseDown).toHaveBeenCalledTimes(1);
  });

  it('should expose a focusable button for keyboard users', () => {
    render(
      <CatalogClickableLabel data-testid="label" onClick={vi.fn()}>
        timer
      </CatalogClickableLabel>,
    );

    const button = screen.getByRole('button', { name: 'timer' });
    button.focus();

    expect(button).toHaveFocus();
  });
});
