import { render, screen } from '@testing-library/react';

import { NodeTitleText } from './NodeTitleText';

describe('NodeTitleText', () => {
  it('should wrap text in a span with node-title__text class', () => {
    render(<NodeTitleText rank={0} title="Hello" />);
    const span = screen.getByText('Hello');
    expect(span.tagName).toBe('SPAN');
    expect(span).toHaveClass('node-title__text');
    expect(span).toHaveAttribute('data-rank', '0');
  });

  it('should include custom className', () => {
    render(<NodeTitleText className="custom-class" rank={2} title="Test" />);
    const span = screen.getByText('Test');
    expect(span).toHaveClass('node-title__text', 'custom-class');
    expect(span).toHaveAttribute('data-rank', '2');
  });
});
