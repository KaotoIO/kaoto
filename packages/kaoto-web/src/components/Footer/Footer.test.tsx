import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from './Footer';

describe('Footer', () => {
  it('renders a footer landmark', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the current year copyright notice', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(`Copyright IBM ${year}`)).toBeInTheDocument();
  });

  it('renders the Footer text', () => {
    render(<Footer />);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
