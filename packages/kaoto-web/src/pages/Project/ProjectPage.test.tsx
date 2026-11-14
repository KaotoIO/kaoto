import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetTestIndexedDB } from '../../test/indexed-db';
import ProjectPage from './ProjectPage';

describe('ProjectPage', () => {
  beforeEach(() => {
    resetTestIndexedDB();
  });

  it('renders ProjectLayout (banner and explorer are present)', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/my-project']}>
        <Routes>
          <Route path="projects/:projectId" element={<ProjectPage />} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('project-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('explorer')).toBeInTheDocument();
    // Let the project files finish loading, so that nothing runs on after the test
    expect(await screen.findByTestId('explorer-folder-integrations')).toBeInTheDocument();
  });
});
