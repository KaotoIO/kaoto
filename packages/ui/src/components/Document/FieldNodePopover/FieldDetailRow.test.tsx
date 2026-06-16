import { render, screen } from '@testing-library/react';

import { FieldDetailRow } from './FieldDetailRow';

describe('FieldDetailRow', () => {
  it('should render label and value', () => {
    render(<FieldDetailRow label="Category" value="Element" />);

    expect(screen.getByText('Category:')).toBeInTheDocument();
    expect(screen.getByText('Element')).toBeInTheDocument();
  });

  it('should apply correct CSS classes', () => {
    const { container } = render(<FieldDetailRow label="Test" value="Value" />);

    const row = container.querySelector('.field__row');
    expect(row).toBeInTheDocument();

    const titleCell = container.querySelector('.field__cell--title');
    expect(titleCell).toBeInTheDocument();
    expect(titleCell).toHaveTextContent('Test:');

    const cells = container.querySelectorAll('.field__cell');
    expect(cells).toHaveLength(2);
  });

  it('should render with empty value', () => {
    const { container } = render(<FieldDetailRow label="Empty" value="" />);

    expect(screen.getByText('Empty:')).toBeInTheDocument();
    const valueCell = container.querySelectorAll('.field__cell')[1];
    expect(valueCell).toHaveTextContent('');
  });

  it('should render with special characters in label', () => {
    render(<FieldDetailRow label="Min/Max Occurs" value="1" />);

    expect(screen.getByText('Min/Max Occurs:')).toBeInTheDocument();
  });

  it('should render with special characters in value', () => {
    render(<FieldDetailRow label="Namespace" value="http://example.com/schema" />);

    expect(screen.getByText('http://example.com/schema')).toBeInTheDocument();
  });

  it('should render with long value', () => {
    const longValue = 'This is a very long value that might wrap to multiple lines in the UI';
    render(<FieldDetailRow label="Description" value={longValue} />);

    expect(screen.getByText(longValue)).toBeInTheDocument();
  });

  it('should render with numeric value', () => {
    render(<FieldDetailRow label="Min Occurs" value="0" />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should render label with colon', () => {
    const { container } = render(<FieldDetailRow label="Type" value="string" />);

    const titleCell = container.querySelector('.field__cell--title');
    expect(titleCell?.textContent).toBe('Type:');
  });

  it('should render value in separate cell', () => {
    const { container } = render(<FieldDetailRow label="Category" value="Element" />);

    const cells = container.querySelectorAll('.field__cell');
    expect(cells[0]).toHaveClass('field__cell--title');
    expect(cells[0]).toHaveTextContent('Category:');
    expect(cells[1]).toHaveClass('field__cell');
    expect(cells[1]).not.toHaveClass('field__cell--title');
    expect(cells[1]).toHaveTextContent('Element');
  });
});
