import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import ProjectPage from './ProjectPage';

describe('ProjectPage', () => {
  it('renders ProjectLayout (banner and explorer are present)', () => {
    render(
      <MemoryRouter initialEntries={['/projects/my-project']}>
        <Routes>
          <Route path="projects/:projectId" element={<ProjectPage />} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('project-banner')).toBeInTheDocument();
    expect(screen.getByTestId('explorer')).toBeInTheDocument();
  });
});
