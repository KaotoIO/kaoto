import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Explorer } from './Explorer';

describe('Explorer', () => {
  it('renders with the correct data-testid', () => {
    render(<Explorer />);
    expect(screen.getByTestId('explorer')).toBeInTheDocument();
  });

  it('renders placeholder text', () => {
    render(<Explorer />);
    expect(screen.getByText('Explorer')).toBeInTheDocument();
  });
});
