import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useFiles } from '../hooks/useFiles';
import { useRuntimeContext } from '../hooks/useRuntimeContext';
import { storeTestFiles } from '../test/files';
import { resetTestIndexedDB } from '../test/indexed-db';
import { ProjectLayout } from './ProjectLayout';

const renderLayout = (outlet = <div data-testid="outlet-content">Outlet</div>) =>
  render(
    <MemoryRouter initialEntries={['/workspace']}>
      <Routes>
        <Route path="workspace" element={<ProjectLayout />}>
          <Route index element={outlet} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('ProjectLayout', () => {
  beforeEach(() => {
    resetTestIndexedDB();
  });

  it('provides the stored files to outlet children', async () => {
    await storeTestFiles();
    const FilesConsumer = () => {
      const { files } = useFiles(); // throws if FilesProvider is not in the tree
      return <div data-testid="files-consumer">{files.some((file) => file.id === 'main-flow') ? 'stored' : ''}</div>;
    };

    renderLayout(<FilesConsumer />);

    expect(await screen.findByText('stored')).toBeInTheDocument();
  });

  it.each([
    ['project toolbar', 'project-toolbar'],
    ['explorer sidebar', 'explorer'],
    ['outlet content', 'outlet-content'],
  ])('renders the %s', async (_label, testId) => {
    renderLayout();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
    // Let the files finish loading, so that nothing runs on after the test
    expect(await screen.findByTestId('explorer-empty')).toBeInTheDocument();
  });

  it('renders toolbar before explorer in the DOM', async () => {
    const { container } = renderLayout();
    const toolbar = container.querySelector('[data-testid="project-toolbar"]')!;
    const explorer = container.querySelector('[data-testid="explorer"]')!;
    expect(toolbar.compareDocumentPosition(explorer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await screen.findByTestId('explorer-empty')).toBeInTheDocument();
  });

  it('provides RuntimeContext to outlet children', async () => {
    const RuntimeConsumer = () => {
      useRuntimeContext(); // throws if RuntimeProvider is not in the tree
      return <div data-testid="runtime-consumer">ok</div>;
    };

    renderLayout(<RuntimeConsumer />);

    expect(screen.getByTestId('runtime-consumer')).toBeInTheDocument();
    expect(await screen.findByTestId('explorer-empty')).toBeInTheDocument();
  });
});
