import { fireEvent, render, screen } from '@testing-library/react';

import { EntryLabel } from './EntryLabel';
import { ExplorerFile } from './explorer-file';

const FILE: ExplorerFile = { id: 'main-flow', name: 'Main-Flow.camel.yaml', type: 'integration' };
const FOLDER: ExplorerFile = { id: 'folder:integrations', name: 'integrations', type: 'folder', children: [] };

describe('EntryLabel', () => {
  const requestDelete = vi.fn();
  const requestRename = vi.fn();

  beforeEach(() => {
    requestDelete.mockReset();
    requestRename.mockReset();
  });

  const renderLabel = (node: ExplorerFile, query = '') =>
    render(<EntryLabel node={node} query={query} requestDelete={requestDelete} requestRename={requestRename} />);

  it('shows the name with its full text as the tooltip', () => {
    renderLabel(FILE);

    expect(screen.getByTitle('Main-Flow.camel.yaml')).toHaveTextContent('Main-Flow.camel.yaml');
    expect(document.querySelector('mark')).not.toBeInTheDocument();
  });

  it('marks the part of the name that matches the search, ignoring case', () => {
    renderLabel(FILE, 'flow');

    expect(screen.getByTitle('Main-Flow.camel.yaml')).toHaveTextContent('Main-Flow.camel.yaml');
    expect(document.querySelector('mark')).toHaveTextContent(/^Flow$/);
  });

  it('marks nothing when the search does not match', () => {
    renderLabel(FILE, 'kafka');

    expect(screen.getByTitle('Main-Flow.camel.yaml')).toBeInTheDocument();
    expect(document.querySelector('mark')).not.toBeInTheDocument();
  });

  it('offers rename and delete for a file, outside the accessibility tree', () => {
    renderLabel(FILE);

    const rename = screen.getByTestId('explorer-rename-main-flow');
    const remove = screen.getByTestId('explorer-delete-main-flow');
    expect(rename).toHaveAttribute('title', 'Rename file');
    expect(remove).toHaveAttribute('title', 'Delete file');
    expect(rename.parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(remove.parentElement).toBe(rename.parentElement);
  });

  it('offers only delete for a folder', () => {
    renderLabel(FOLDER);

    expect(screen.queryByTestId('explorer-rename-folder:integrations')).not.toBeInTheDocument();
    expect(screen.getByTestId('explorer-delete-folder:integrations')).toHaveAttribute('title', 'Delete folder');
  });

  it('asks to rename the file and to delete the entry', () => {
    renderLabel(FILE);

    fireEvent.click(screen.getByTestId('explorer-rename-main-flow'));
    fireEvent.click(screen.getByTestId('explorer-delete-main-flow'));

    expect(requestRename).toHaveBeenCalledWith('main-flow');
    expect(requestDelete).toHaveBeenCalledWith(FILE);
  });
});
