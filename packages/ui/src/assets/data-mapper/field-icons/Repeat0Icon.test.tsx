import { render } from '@testing-library/react';
import React from 'react';

import Repeat0Icon from './Repeat0Icon';

describe('Repeat0Icon', () => {
  it('should render "0+" text', () => {
    const { container } = render(<Repeat0Icon />);
    const text = container.querySelector('text');

    expect(text).toBeInTheDocument();
    expect(text).toHaveTextContent('0+');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<SVGSVGElement>();
    render(<Repeat0Icon ref={ref} />);

    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });

  it('should accept and apply additional props', () => {
    const { container } = render(<Repeat0Icon className="custom-class" data-testid="repeat0-icon" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('custom-class');
    expect(svg).toHaveAttribute('data-testid', 'repeat0-icon');
  });
});
