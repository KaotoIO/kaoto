import { render, screen } from '@testing-library/react';

import { FieldDetailsContent } from './FieldDetailsContent';

describe('FieldDetailsContent', () => {
  it('should render empty content when items array is empty', () => {
    const { container } = render(<FieldDetailsContent items={[]} />);

    expect(container.querySelector('.field__content')).toBeInTheDocument();
    expect(container.querySelector('.field__row')).not.toBeInTheDocument();
  });

  it('should render single item', () => {
    const items = [{ label: 'Category', value: 'Element' }];

    render(<FieldDetailsContent items={items} />);

    expect(screen.getByText('Category:')).toBeInTheDocument();
    expect(screen.getByText('Element')).toBeInTheDocument();
  });

  it('should render multiple items', () => {
    const items = [
      { label: 'Category', value: 'Element' },
      { label: 'Type', value: 'string' },
      { label: 'Min Occurs', value: '1' },
    ];

    render(<FieldDetailsContent items={items} />);

    expect(screen.getByText('Category:')).toBeInTheDocument();
    expect(screen.getByText('Element')).toBeInTheDocument();
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('string')).toBeInTheDocument();
    expect(screen.getByText('Min Occurs:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should render items in the order provided', () => {
    const items = [
      { label: 'First', value: 'A' },
      { label: 'Second', value: 'B' },
      { label: 'Third', value: 'C' },
    ];

    const { container } = render(<FieldDetailsContent items={items} />);

    const rows = container.querySelectorAll('.field__row');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('First:');
    expect(rows[1]).toHaveTextContent('Second:');
    expect(rows[2]).toHaveTextContent('Third:');
  });

  it('should handle special characters in values', () => {
    const items = [
      { label: 'Namespace', value: 'http://example.com/schema' },
      { label: 'Description', value: 'A field with <special> & "characters"' },
    ];

    render(<FieldDetailsContent items={items} />);

    expect(screen.getByText('http://example.com/schema')).toBeInTheDocument();
    expect(screen.getByText('A field with <special> & "characters"')).toBeInTheDocument();
  });

  it('should apply correct CSS class to container', () => {
    const items = [{ label: 'Test', value: 'Value' }];

    const { container } = render(<FieldDetailsContent items={items} />);

    expect(container.firstChild).toHaveClass('field__content');
  });
});
