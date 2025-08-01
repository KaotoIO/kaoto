import { render } from '@testing-library/react';
import { FloatingCircle } from './FloatingCircle';

describe('FloatingCircle', () => {
  it('renders children correctly', () => {
    const { container } = render(<FloatingCircle>Test Content</FloatingCircle>);
    expect(container).toMatchSnapshot();
  });

  it('applies custom className', () => {
    const { container } = render(<FloatingCircle className="my-class">Content</FloatingCircle>);
    expect(container).toMatchSnapshot();
  });

  it('renders without children', () => {
    const { container } = render(<FloatingCircle />);
    expect(container).toMatchSnapshot();
  });
});
