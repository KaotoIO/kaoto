import { fireEvent, render, screen } from '@testing-library/react';

import { RestDslResizeHandle } from './RestDslResizeHandle';

describe('RestDslResizeHandle', () => {
  it('renders resize handle button', () => {
    const onResizeStart = jest.fn();
    render(<RestDslResizeHandle onResizeStart={onResizeStart} />);

    const button = screen.getByRole('button', { name: /resize/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onResizeStart when mouse down on handle', () => {
    const onResizeStart = jest.fn();
    render(<RestDslResizeHandle onResizeStart={onResizeStart} />);

    const button = screen.getByRole('button', { name: /resize/i });
    fireEvent.mouseDown(button);

    expect(onResizeStart).toHaveBeenCalledTimes(1);
    expect(onResizeStart).toHaveBeenCalledWith(expect.any(Object));
  });

  it('has correct CSS class', () => {
    const onResizeStart = jest.fn();
    const { container } = render(<RestDslResizeHandle onResizeStart={onResizeStart} />);

    const splitItem = container.querySelector('.rest-dsl-page-resize-handle');
    expect(splitItem).toBeInTheDocument();
  });
});
