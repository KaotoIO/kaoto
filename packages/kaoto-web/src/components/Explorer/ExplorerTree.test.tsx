import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { ExplorerFile } from './explorer-file';
import { ExplorerActions } from './ExplorerEntry';
import { ExplorerTree } from './ExplorerTree';
import { ExplorerRow } from './visible-rows';

const file = (id: string): ExplorerFile => ({
  id,
  path: `${id}.camel.yaml`,
  name: `${id}.camel.yaml`,
  type: 'integration',
});
const A1 = file('a1');
const A = { id: 'A', path: 'A', name: 'A', type: 'folder', children: [A1] } satisfies ExplorerFile;
const TOP = file('top');

/** Folder A expanded with its file a1, then the file top */
const ROWS: ExplorerRow[] = [
  { kind: 'folder', node: A, depth: 0, positionInSet: 1, setSize: 1, isExpanded: true },
  { kind: 'file', node: A1, depth: 1, positionInSet: 1, setSize: 1 },
  { kind: 'file', node: TOP, depth: 0, positionInSet: 1, setSize: 1 },
];

/** Stand-ins for the handlers the Explorer passes */
const actions: ExplorerActions = {
  openFile: vi.fn(),
  toggleFolder: vi.fn(),
  requestRename: vi.fn(),
  requestDelete: vi.fn(),
  finishRename: vi.fn(),
  finishCreate: vi.fn(),
};

const onRowFocus = vi.fn();

/** The tree as the Explorer renders it; the Explorer keeps the row focused last and passes it back in */
const treeElement = (
  rows: ExplorerRow[],
  { openFileKey, focusedRowId }: { openFileKey?: string; focusedRowId?: string },
) =>
  withFiles(
    <ExplorerTree
      rows={rows}
      openFileKey={openFileKey}
      focusedRowId={focusedRowId}
      onRowFocus={onRowFocus}
      query=""
      renaming={undefined}
      actions={actions}
    />,
  );

const renderTree = (rows: ExplorerRow[] = ROWS, openFileKey?: string, focusedRowId?: string) =>
  render(treeElement(rows, { openFileKey, focusedRowId }));

const item = (id: string) => document.getElementById(id)!;
/** Focuses the row the way a click or Tab does, with React's update applied */
const focusRow = (id: string) => {
  act(() => {
    item(id).focus();
  });
};
const tabStops = () => screen.getAllByRole('treeitem').filter((row) => row.tabIndex === 0);

describe('ExplorerTree', () => {
  beforeEach(() => {
    resetTestIndexedDB();
  });

  it('moves the focus between the rows with the arrow keys', async () => {
    const user = userEvent.setup();
    renderTree();
    focusRow('A');

    await user.keyboard('{ArrowDown}');
    expect(item('a1')).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(item('A')).toHaveFocus();
  });

  it.each([
    ['Home', 'top', 'A'],
    ['End', 'A', 'top'],
  ])('moves the focus to the first or last row with %s', async (key, from, to) => {
    const user = userEvent.setup();
    renderTree();
    focusRow(from);

    await user.keyboard(`{${key}}`);

    expect(item(to)).toHaveFocus();
  });

  it('toggles a folder with Enter', async () => {
    const user = userEvent.setup();
    renderTree();
    focusRow('A');

    await user.keyboard('{Enter}');

    expect(actions.toggleFolder).toHaveBeenCalledWith('A', false);
  });

  it('opens a file with Enter', async () => {
    const user = userEvent.setup();
    renderTree();
    focusRow('top');

    await user.keyboard('{Enter}');

    expect(actions.openFile).toHaveBeenCalledWith(TOP);
  });

  it('keeps the page from scrolling on the keys it handles', () => {
    renderTree();

    const handled = fireEvent.keyDown(item('A'), { key: 'ArrowDown' });

    expect(handled).toBe(false);
  });

  it('leaves the keys typed into the name field of a new entry alone', async () => {
    const rows: ExplorerRow[] = [
      ...ROWS,
      { kind: 'new-entry', entryKind: 'file', folderPath: '', depth: 0, positionInSet: 1, setSize: 1, key: 1 },
    ];
    renderTree(rows);
    const field = screen.getByRole('textbox');

    await userEvent.type(field, 'x{ArrowDown}{Home}{ArrowUp} ');

    expect(field).toHaveFocus();
    expect(actions.toggleFolder).not.toHaveBeenCalled();
    expect(actions.openFile).not.toHaveBeenCalled();
  });

  it('makes the open file the tab stop when it is shown', () => {
    renderTree(ROWS, 'a1');

    expect(tabStops()).toEqual([item('a1')]);
  });

  it('makes the first row the tab stop when the open file is not shown', () => {
    renderTree(ROWS, 'hidden-in-a-collapsed-folder');

    expect(tabStops()).toEqual([item('A')]);
  });

  it('makes the row focused last the tab stop', () => {
    renderTree(ROWS, 'a1', 'top');

    expect(tabStops()).toEqual([item('top')]);
  });

  it('reports a focused row to the Explorer, which keeps it', () => {
    renderTree();

    focusRow('top');

    expect(onRowFocus).toHaveBeenCalledWith('top');
  });

  it('does not report the name field of a new entry as a focused row', () => {
    renderTree([
      ...ROWS,
      { kind: 'new-entry', entryKind: 'file', folderPath: '', depth: 0, positionInSet: 1, setSize: 1, key: 1 },
    ]);

    act(() => {
      screen.getByRole('textbox').focus();
    });

    expect(onRowFocus).not.toHaveBeenCalled();
  });

  it('moves the tab stop away from a row that is no longer shown', () => {
    const { rerender } = renderTree(ROWS, 'top', 'a1');

    const collapsed: ExplorerRow[] = [
      { kind: 'folder', node: A, depth: 0, positionInSet: 1, setSize: 1, isExpanded: false },
      { kind: 'file', node: TOP, depth: 0, positionInSet: 1, setSize: 1 },
    ];
    rerender(treeElement(collapsed, { openFileKey: 'top', focusedRowId: 'a1' }));

    expect(tabStops()).toEqual([item('top')]);
  });

  it.each(['{Enter}', ' ', '{ArrowRight}', '{ArrowLeft}', '{ArrowDown}'])(
    'ignores %j pressed on the tree itself, outside the rows',
    async (key) => {
      const user = userEvent.setup();
      renderTree();
      const tree = screen.getByRole('tree');
      act(() => {
        tree.focus();
      });

      await user.keyboard(key);

      expect(actions.openFile).not.toHaveBeenCalled();
      expect(actions.toggleFolder).not.toHaveBeenCalled();
      expect(tree).toHaveFocus();
    },
  );

  it.each(['ArrowLeft', 'ArrowRight'])('leaves %s to the browser as well, e.g. for Alt+arrow navigation', (key) => {
    renderTree();

    const notPrevented = fireEvent.keyDown(item('top'), { key, altKey: true });

    expect(notPrevented).toBe(true);
  });

  it('keeps every key pressed on a row inside the tree, away from the shortcuts of the page', async () => {
    const user = userEvent.setup();
    const outside = vi.fn();
    document.addEventListener('keydown', outside);
    renderTree();
    focusRow('top');

    await user.keyboard('{Control>}z{/Control}');

    document.removeEventListener('keydown', outside);
    expect(outside).not.toHaveBeenCalled();
  });

  it('makes the first row with an entry the tab stop while a new folder is named at the top', () => {
    const rows: ExplorerRow[] = [
      { kind: 'new-entry', entryKind: 'folder', folderPath: '', depth: 0, positionInSet: 1, setSize: 1, key: 1 },
      ...ROWS,
    ];

    renderTree(rows);

    expect(tabStops()).toEqual([item('A')]);
  });

  it('shows an empty tree without rows, and ignores keys on it', async () => {
    const user = userEvent.setup();
    renderTree([]);
    const tree = screen.getByRole('tree');
    act(() => {
      tree.focus();
    });

    await user.keyboard('{ArrowDown}');

    expect(screen.queryAllByRole('treeitem')).toEqual([]);
    expect(actions.toggleFolder).not.toHaveBeenCalled();
  });
});
