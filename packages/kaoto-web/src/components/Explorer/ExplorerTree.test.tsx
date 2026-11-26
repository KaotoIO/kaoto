import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { VirtuosoTestViewport } from '../../test/virtuoso';
import { ExplorerFile } from './explorer-file';
import { ExplorerActions } from './ExplorerEntry';
import { ExplorerTree, ExplorerTreeHandle } from './ExplorerTree';
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
  render(treeElement(rows, { openFileKey, focusedRowId }), { wrapper: VirtuosoTestViewport });

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
    'ignores %j pressed beside the rows, after a click on the free space of the tree',
    async (key) => {
      const user = userEvent.setup();
      renderTree();
      const freeSpace = screen.getByTestId('virtuoso-scroller');
      await user.click(freeSpace);

      await user.keyboard(key);

      expect(actions.openFile).not.toHaveBeenCalled();
      expect(actions.toggleFolder).not.toHaveBeenCalled();
      expect(freeSpace).toHaveFocus();
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

  describe('with more rows than fit in view', () => {
    /** 20 files at the root, of which only the first few are rendered */
    const MANY_ROWS: ExplorerRow[] = Array.from({ length: 20 }, (_, index) => ({
      kind: 'file' as const,
      node: file(`file-${index}`),
      depth: 0,
      positionInSet: index + 1,
      setSize: 20,
    }));

    const renderLongTree = (openFileKey?: string) => {
      const handle = createRef<ExplorerTreeHandle>();
      const rendered = render(
        withFiles(
          <ExplorerTree
            ref={handle}
            rows={MANY_ROWS}
            openFileKey={openFileKey}
            focusedRowId={undefined}
            onRowFocus={onRowFocus}
            query=""
            renaming={undefined}
            actions={actions}
          />,
        ),
        {
          wrapper: ({ children }) => (
            <VirtuosoTestViewport viewportHeight={64} itemHeight={32}>
              {children}
            </VirtuosoTestViewport>
          ),
        },
      );
      return { ...rendered, handle };
    };

    const tree = () => screen.getByRole('tree');
    /** Every element in the tree that Tab stops at, the tree itself included */
    const focusables = () =>
      [tree(), ...tree().querySelectorAll<HTMLElement>('*')].filter((element) => element.tabIndex === 0);

    it.each([
      { openFile: 'file-0', where: 'rendered', tabStop: () => item('file-0') },
      { openFile: 'file-19', where: 'not rendered', tabStop: tree },
    ])('can be reached by Tab exactly once while the tab stop row is $where', ({ openFile, tabStop }) => {
      renderLongTree(openFile);

      expect(focusables()).toEqual([tabStop()]);
    });

    it('renders only the rows in view and a small overscan', () => {
      renderLongTree();

      expect(document.getElementById('file-19')).toBeNull();
    });

    it('moves the focus to a row out of view with End, and back with Home', async () => {
      renderLongTree();
      focusRow('file-0');

      fireEvent.keyDown(item('file-0'), { key: 'End' });
      await waitFor(() => {
        expect(document.getElementById('file-19')).toHaveFocus();
      });

      fireEvent.keyDown(item('file-19'), { key: 'Home' });
      await waitFor(() => {
        expect(document.getElementById('file-0')).toHaveFocus();
      });
    });

    it('moves down past the rendered rows with ArrowDown', async () => {
      renderLongTree();
      // The 64px view and the overscan render file-0 to file-11
      expect(document.getElementById('file-13')).toBeNull();
      focusRow('file-10');

      for (const from of ['file-10', 'file-11', 'file-12']) {
        await waitFor(() => {
          expect(document.getElementById(from)).toHaveFocus();
        });
        fireEvent.keyDown(item(from), { key: 'ArrowDown' });
      }

      await waitFor(() => {
        expect(document.getElementById('file-13')).toHaveFocus();
      });
    });

    it('takes no tab stop of its own while the name field of a new entry is the only row', () => {
      render(
        withFiles(
          <ExplorerTree
            rows={[
              { kind: 'new-entry', entryKind: 'file', folderPath: '', depth: 0, positionInSet: 1, setSize: 1, key: 1 },
            ]}
            openFileKey={undefined}
            focusedRowId={undefined}
            onRowFocus={onRowFocus}
            query=""
            renaming={undefined}
            actions={actions}
          />,
        ),
        { wrapper: VirtuosoTestViewport },
      );

      expect(focusables()).toEqual([screen.getByRole('textbox')]);
    });

    it('hands the focus on to the tab stop row when it is not rendered', async () => {
      renderLongTree('file-19');

      act(() => {
        tree().focus();
      });

      await waitFor(() => {
        expect(document.getElementById('file-19')).toHaveFocus();
      });
    });

    it('focuses a row that is not rendered through focusRow', async () => {
      const { handle } = renderLongTree();

      let found = false;
      act(() => {
        found = handle.current!.focusRow('file-15');
      });

      expect(found).toBe(true);
      await waitFor(() => {
        expect(document.getElementById('file-15')).toHaveFocus();
      });
    });

    it('focuses the first entry row through focusFirstRow, after scrolling to it', async () => {
      const { handle } = renderLongTree();
      focusRow('file-0');
      fireEvent.keyDown(item('file-0'), { key: 'End' });
      await waitFor(() => {
        expect(document.getElementById('file-19')).toHaveFocus();
      });

      let found = false;
      act(() => {
        found = handle.current!.focusFirstRow();
      });

      expect(found).toBe(true);
      await waitFor(() => {
        expect(document.getElementById('file-0')).toHaveFocus();
      });
    });

    it('reports a row that does not exist from focusRow, without moving the focus', () => {
      const { handle } = renderLongTree();
      focusRow('file-0');

      const found = handle.current!.focusRow('nope');

      expect(found).toBe(false);
      expect(item('file-0')).toHaveFocus();
    });
  });
});
