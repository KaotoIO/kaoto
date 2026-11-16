import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetTestIndexedDB } from '../../test/indexed-db';
import ProjectPage from './ProjectPage';

describe('ProjectPage', () => {
  beforeEach(() => {
    resetTestIndexedDB();
  });

  it('renders ProjectLayout (toolbar and explorer are present)', async () => {
    render(
      <MemoryRouter initialEntries={['/workspace']}>
        <Routes>
          <Route path="workspace" element={<ProjectPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('project-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('explorer')).toBeInTheDocument();
    // Let the files finish loading, so that nothing runs on after the test
    expect(await screen.findByTestId('explorer-empty')).toBeInTheDocument();
  });
});
