import { render } from '@testing-library/react';
import React from 'react';

import OptIcon from './OptIcon';

describe('OptIcon', () => {
  it('should render "Opt" text', () => {
    const { container } = render(<OptIcon />);
    const text = container.querySelector('text');

    expect(text).toBeInTheDocument();
    expect(text).toHaveTextContent('Opt');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<SVGSVGElement>();
    render(<OptIcon ref={ref} />);

    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });

  it('should accept and apply additional props', () => {
    const { container } = render(<OptIcon className="custom-class" data-testid="opt-icon" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('custom-class');
    expect(svg).toHaveAttribute('data-testid', 'opt-icon');
  });
});
