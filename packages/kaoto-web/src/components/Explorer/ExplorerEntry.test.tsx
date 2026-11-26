import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileEntry } from '../../store/files/files-ui-state';
import { withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { ExplorerFile } from './explorer-file';
import { ExplorerActions, ExplorerEntry } from './ExplorerEntry';
import { ExplorerRow } from './visible-rows';

const FILE: ExplorerFile = {
  id: 'k-file',
  path: 'routes/orders.camel.yaml',
  name: 'orders.camel.yaml',
  type: 'integration',
};
const FOLDER: ExplorerFile = { id: 'k-folder', path: 'routes', name: 'routes', type: 'folder', children: [FILE] };

const FILE_ROW: ExplorerRow = { kind: 'file', node: FILE, depth: 1, positionInSet: 2, setSize: 2 };
const FOLDER_ROW: ExplorerRow = {
  kind: 'folder',
  node: FOLDER,
  depth: 0,
  positionInSet: 1,
  setSize: 3,
  isExpanded: true,
};
const COLLAPSED_FOLDER_ROW: ExplorerRow = { ...FOLDER_ROW, isExpanded: false };
const NEW_ENTRY_ROW: ExplorerRow = {
  kind: 'new-entry',
  entryKind: 'file',
  folderPath: 'routes',
  depth: 1,
  positionInSet: 1,
  setSize: 2,
  key: 1,
};

/** Stand-ins for the handlers the Explorer passes */
const actions: ExplorerActions = {
  openFile: vi.fn(),
  toggleFolder: vi.fn(),
  requestRename: vi.fn(),
  requestDelete: vi.fn(),
  finishRename: vi.fn(),
  finishCreate: vi.fn(),
};

const renderEntry = (
  row: ExplorerRow,
  { isOpenFile = false, isTabStop = false, query = '', renaming = undefined as FileEntry | undefined } = {},
) =>
  render(
    withFiles(
      <ExplorerEntry
        row={row}
        isOpenFile={isOpenFile}
        isTabStop={isTabStop}
        query={query}
        renaming={renaming}
        actions={actions}
      />,
    ),
  );

describe('ExplorerEntry', () => {
  beforeEach(() => {
    resetTestIndexedDB();
  });

  it.each([
    [
      'an expanded folder',
      FOLDER_ROW,
      false,
      {
        'aria-level': '1',
        'aria-posinset': '1',
        'aria-setsize': '3',
        'aria-expanded': 'true',
        'aria-selected': 'false',
      },
    ],
    ['a collapsed folder', COLLAPSED_FOLDER_ROW, false, { 'aria-level': '1', 'aria-expanded': 'false' }],
    [
      'a file',
      FILE_ROW,
      false,
      { 'aria-level': '2', 'aria-posinset': '2', 'aria-setsize': '2', 'aria-selected': 'false' },
    ],
    ['the open file', FILE_ROW, true, { 'aria-level': '2', 'aria-selected': 'true' }],
  ])('describes %s as a tree item', (_, row, isOpenFile, attributes) => {
    renderEntry(row, { isOpenFile });

    const item = screen.getByRole('treeitem');
    for (const [name, value] of Object.entries(attributes)) expect(item).toHaveAttribute(name, value);
  });

  it('leaves aria-expanded off a file', () => {
    renderEntry(FILE_ROW);

    expect(screen.getByRole('treeitem')).not.toHaveAttribute('aria-expanded');
  });

  it('describes the row of a new entry by its depth and its place among its siblings', () => {
    renderEntry(NEW_ENTRY_ROW);

    const item = screen.getByTestId('explorer-new-entry');
    expect(item).toHaveAttribute('aria-level', '2');
    expect(item).toHaveAttribute('aria-posinset', '1');
    expect(item).toHaveAttribute('aria-setsize', '2');
  });

  it.each([
    [COLLAPSED_FOLDER_ROW, true],
    [FOLDER_ROW, false],
  ])('toggles the folder with its chevron, without opening anything', async (row, isExpanded) => {
    renderEntry(row);

    await userEvent.click(screen.getByTestId('explorer-toggle-routes'));

    expect(actions.toggleFolder).toHaveBeenCalledWith('k-folder', isExpanded);
    expect(actions.openFile).not.toHaveBeenCalled();
  });

  it('opens a file when its row is clicked', async () => {
    renderEntry(FILE_ROW);

    await userEvent.click(screen.getByText('orders.camel.yaml'));

    expect(actions.openFile).toHaveBeenCalledWith(FILE);
  });

  it('only focuses a folder when its row is clicked', async () => {
    renderEntry(FOLDER_ROW, { isTabStop: true });

    await userEvent.click(screen.getByText('routes'));

    expect(screen.getByRole('treeitem')).toHaveFocus();
    expect(actions.toggleFolder).not.toHaveBeenCalled();
    expect(actions.openFile).not.toHaveBeenCalled();
  });

  it('asks to rename the entry on F2', async () => {
    const user = userEvent.setup();
    renderEntry(FILE_ROW);
    act(() => {
      screen.getByRole('treeitem').focus();
    });

    await user.keyboard('{F2}');

    expect(actions.requestRename).toHaveBeenCalledWith('k-file');
  });

  it.each(['Delete', 'Backspace'])('asks to delete the entry on %s', async (key) => {
    const user = userEvent.setup();
    renderEntry(FOLDER_ROW);
    act(() => {
      screen.getByRole('treeitem').focus();
    });

    await user.keyboard(`{${key}}`);

    expect(actions.requestDelete).toHaveBeenCalledWith(FOLDER);
  });

  it('shows the rename field instead of the name while the entry is renamed', () => {
    renderEntry(FILE_ROW, { renaming: { key: 'k-file', kind: 'file', path: FILE.path, name: FILE.name } });

    expect(screen.getByRole('textbox')).toHaveValue('orders.camel.yaml');
    expect(screen.queryByTitle('orders.camel.yaml')).not.toBeInTheDocument();
  });

  it('shows the name field in the row of a new entry', () => {
    renderEntry(NEW_ENTRY_ROW);

    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it.each([
    [true, '0'],
    [false, '-1'],
  ])('is the tab stop of the tree or not: %s', (isTabStop, tabIndex) => {
    renderEntry(FILE_ROW, { isTabStop });

    expect(screen.getByRole('treeitem')).toHaveAttribute('tabindex', tabIndex);
  });

  it('highlights the part of the name that matches the search', () => {
    renderEntry(FILE_ROW, { query: 'ord' });

    expect(screen.getByText('ord').tagName).toBe('MARK');
  });
});
