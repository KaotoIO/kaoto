import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ProjectLayout } from './ProjectLayout';

const renderLayout = (outlet = <div data-testid="outlet-content">Outlet</div>) =>
  render(
    <MemoryRouter initialEntries={['/projects/my-project']}>
      <Routes>
        <Route path="projects/:projectId" element={<ProjectLayout />}>
          <Route index element={outlet} />
        </Route>
        <Route path="/" element={<div data-testid="home">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProjectLayout', () => {
  it.each([
    ['project banner', 'project-banner'],
    ['explorer sidebar', 'explorer'],
    ['outlet content', 'outlet-content'],
  ])('renders the %s', (_label, testId) => {
    renderLayout();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('renders banner before explorer in the DOM', () => {
    const { container } = renderLayout();
    const banner = container.querySelector('[data-testid="project-banner"]')!;
    const explorer = container.querySelector('[data-testid="explorer"]')!;
    expect(banner.compareDocumentPosition(explorer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('redirects to / when projectId contains invalid characters', () => {
    render(
      <MemoryRouter initialEntries={['/projects/<bad>']}>
        <Routes>
          <Route path="projects/:projectId" element={<ProjectLayout />} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('home')).toBeInTheDocument();
  });
});
