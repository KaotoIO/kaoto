import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProjectBanner } from './ProjectBanner';

describe('ProjectBanner', () => {
  it('renders with the correct data-testid', () => {
    render(<ProjectBanner />);
    expect(screen.getByTestId('project-banner')).toBeInTheDocument();
  });

  it('renders placeholder text', () => {
    render(<ProjectBanner />);
    expect(screen.getByText('Project Banner')).toBeInTheDocument();
  });
});
