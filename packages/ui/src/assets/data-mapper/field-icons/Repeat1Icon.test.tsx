import { render } from '@testing-library/react';
import React from 'react';

import Repeat1Icon from './Repeat1Icon';

describe('Repeat1Icon', () => {
  it('should render "1+" text', () => {
    const { container } = render(<Repeat1Icon />);
    const text = container.querySelector('text');

    expect(text).toBeInTheDocument();
    expect(text).toHaveTextContent('1+');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<SVGSVGElement>();
    render(<Repeat1Icon ref={ref} />);

    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });

  it('should accept and apply additional props', () => {
    const { container } = render(<Repeat1Icon className="custom-class" data-testid="repeat1-icon" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('custom-class');
    expect(svg).toHaveAttribute('data-testid', 'repeat1-icon');
  });
});
