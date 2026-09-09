import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KaotoAboutModal } from './KaotoAboutModal';

// version.ts constants fall back to version.json (empty strings) in vitest
describe('KaotoAboutModal', () => {
  it('renders the heading and all version info labels when open', () => {
    render(<KaotoAboutModal isOpen onClose={vi.fn()} />);
    expect(screen.getByText('About Kaoto')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('Git commit hash')).toBeInTheDocument();
    expect(screen.getByText('Git last commit date')).toBeInTheDocument();
  });
});
