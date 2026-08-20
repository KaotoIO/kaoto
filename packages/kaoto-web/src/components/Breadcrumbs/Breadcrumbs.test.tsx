import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs', () => {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Projects', href: '/projects' },
  ];

  it('should render every non-current item as a link with its expected destination', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs items={items} current="Details" />
      </MemoryRouter>,
    );

    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveAttribute('href', '/');

    const projectsLink = screen.getByRole('link', { name: 'Projects' });
    expect(projectsLink).toHaveAttribute('href', '/projects');
  });

  it('should render the current page without a link', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs items={items} current="Details" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Details' })).not.toBeInTheDocument();
  });
});
