import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingInlineState } from './LoadingInlineState';

describe('LoadingInlineState', () => {
  it('should render a spinner with default description', () => {
    render(<LoadingInlineState />);

    expect(screen.getByRole('img', { name: 'Loading' })).toBeInTheDocument();
  });

  it('should use iconDescription as the accessible name of the spinner', () => {
    render(<LoadingInlineState iconDescription="Processing" />);

    expect(screen.getByRole('img', { name: 'Processing' })).toBeInTheDocument();
  });

  it('should render provided description text', () => {
    render(<LoadingInlineState description="Fetching data" />);

    expect(screen.getByText('Fetching data')).toBeVisible();
  });

  it('should keep the spinner and the description when `compact` is set', () => {
    render(<LoadingInlineState compact description="Fetching data" iconDescription="Processing" />);

    expect(screen.getByRole('img', { name: 'Processing' })).toBeInTheDocument();
    expect(screen.getByText('Fetching data')).toBeInTheDocument();
  });
});
