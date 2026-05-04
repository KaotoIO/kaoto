import { render, screen } from '@testing-library/react';
import { ReactElement } from 'react';

import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CustomNodeLabel } from './CustomNodeLabel';

const renderLabel = (ui: ReactElement) => render(<svg>{ui}</svg>);
describe('CustomNodeLabel', () => {
  it('renders the label text with a title', () => {
    renderLabel(<CustomNodeLabel label="timer" x={10} y={20} />);

    const label = screen.getByTitle('timer');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('timer');
  });

  it('uses default width, height, and className', () => {
    const { container } = renderLabel(<CustomNodeLabel label="log" x={0} y={0} />);

    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject).toHaveAttribute('width', String(CanvasDefaults.DEFAULT_LABEL_WIDTH));
    expect(foreignObject).toHaveAttribute('height', String(CanvasDefaults.DEFAULT_LABEL_HEIGHT));
    expect(foreignObject).toHaveClass('custom-node__label');
  });

  it('positions with x and y when transform is not provided', () => {
    const { container } = renderLabel(<CustomNodeLabel label="log" x={12} y={34} />);

    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject).toHaveAttribute('x', '12');
    expect(foreignObject).toHaveAttribute('y', '34');
    expect(foreignObject).not.toHaveAttribute('transform');
  });

  it('uses transform instead of x and y when provided', () => {
    const { container } = renderLabel(<CustomNodeLabel label="log" x={12} y={34} transform="translate(1, 2)" />);

    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject).toHaveAttribute('transform', 'translate(1, 2)');
    expect(foreignObject).not.toHaveAttribute('x');
    expect(foreignObject).not.toHaveAttribute('y');
  });

  it('does not render a warning icon by default', () => {
    const { container } = renderLabel(<CustomNodeLabel label="log" x={0} y={0} />);

    expect(container.querySelector('[data-warning]')).not.toBeInTheDocument();
    expect(container.querySelector('.custom-node__label__text__error')).not.toBeInTheDocument();
  });

  it('renders a warning icon and error class when doesHaveWarnings is true', () => {
    const { container } = renderLabel(
      <CustomNodeLabel label="log" x={0} y={0} doesHaveWarnings validationText="Missing URI" />,
    );

    const warningIcon = container.querySelector('[data-warning="true"]');
    expect(warningIcon).toBeInTheDocument();
    expect(warningIcon).toHaveAttribute('title', 'Missing URI');
    expect(container.querySelector('.custom-node__label__text__error')).toBeInTheDocument();
  });

  it('allows overriding width, height, and className', () => {
    const { container } = renderLabel(
      <CustomNodeLabel label="log" x={0} y={0} width={80} height={16} className="my-label" />,
    );

    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject).toHaveAttribute('width', '80');
    expect(foreignObject).toHaveAttribute('height', '16');
    expect(foreignObject).toHaveClass('my-label');
  });
});
