import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { StrictMode, useState } from 'react';

import { indexedDbStorage } from '../../services/files/indexed-db-storage';
import { useFilesUiStore } from '../../store/files/use-files-ui-store';
import { pathOf, storedPaths, storeTestFiles, withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { RenameField } from './RenameField';

/** Expects the test file with the id to be stored at the path, and no more at its old path when it moved */
const expectStoredAt = async (id: string, path: string) => {
  const paths = await storedPaths();
  expect(paths).toContain(path);
  if (path !== pathOf(id)) expect(paths).not.toContain(pathOf(id));
};

/** The field for the stored entry at the path, once the files are loaded; it keeps the entry when it moves */
const FieldFor = ({ path, onDone }: { path: string; onDone: (byKeyboard: boolean) => void }) => {
  const entries = useFilesUiStore((state) => state.entries);
  const [key, setKey] = useState<string>();
  const entry = entries.find((candidate) => (key ? candidate.key === key : candidate.path === path));
  if (entry && !key) setKey(entry.key);
  return entry ? <RenameField file={entry} onDone={onDone} /> : null;
};

describe('RenameField', () => {
  const onDone = vi.fn();

  beforeEach(async () => {
    resetTestIndexedDB();
    await storeTestFiles([
      { id: 'main-flow', path: 'integrations/main-flow.camel.yaml', content: 'x' },
      { id: 'other', path: 'integrations/other.camel.yaml', content: '' },
    ]);
    onDone.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderField = async (strict = false) => {
    const field = withFiles(<FieldFor path="integrations/main-flow.camel.yaml" onDone={onDone} />);
    const result = render(strict ? <StrictMode>{field}</StrictMode> : field);
    return { ...result, input: (await screen.findByRole('textbox', { name: 'Rename file' })) as HTMLInputElement };
  };

  it.each([false, true])(
    'focuses the field and selects the name before its first dot (StrictMode %s)',
    async (strict) => {
      const { input } = await renderField(strict);

      expect(input).toHaveFocus();
      expect(input).toHaveValue('main-flow.camel.yaml');
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe('main-flow'.length);
    },
  );

  it.each([false, true])(
    'renames the file on Enter and reports it once by keyboard (StrictMode %s)',
    async (strict) => {
      const user = userEvent.setup();
      await renderField(strict);

      await user.keyboard('orders{Enter}');

      await waitFor(() => {
        expect(onDone).toHaveBeenCalledTimes(1);
      });
      expect(onDone).toHaveBeenCalledWith(true);
      await expectStoredAt('main-flow', 'integrations/orders.camel.yaml');
    },
  );

  it('renames the file when the field loses the focus and reports it as not by keyboard', async () => {
    const user = userEvent.setup();
    const { input } = await renderField();

    await user.keyboard('orders');
    act(() => {
      input.blur();
    });

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(false);
    });
    await expectStoredAt('main-flow', 'integrations/orders.camel.yaml');
  });

  it('cancels on Escape without renaming', async () => {
    const rename = vi.spyOn(indexedDbStorage, 'moveFile');
    const user = userEvent.setup();
    await renderField();

    await user.keyboard('orders{Escape}');

    expect(onDone).toHaveBeenCalledWith(true);
    expect(rename).not.toHaveBeenCalled();
  });

  it('does not rename when the field loses the focus after Escape, as it does while it is removed', async () => {
    const rename = vi.spyOn(indexedDbStorage, 'moveFile');
    const user = userEvent.setup();
    const { input } = await renderField();

    await user.keyboard('orders{Escape}');
    act(() => {
      input.blur();
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(rename).not.toHaveBeenCalled();
  });

  it('closes without writing when the name is unchanged', async () => {
    const rename = vi.spyOn(indexedDbStorage, 'moveFile');
    const user = userEvent.setup();
    await renderField();

    await user.keyboard('{Enter}');

    expect(onDone).toHaveBeenCalledWith(true);
    expect(rename).not.toHaveBeenCalled();
  });

  it.each([
    ['a taken name', 'other', 'A file or folder with that name already exists'],
    ['an empty name', '', 'Enter a file name'],
  ])(
    'keeps the field open with the error for %s on Enter, and gives up when the field loses the focus',
    async (_, typed, error) => {
      const rename = vi.spyOn(indexedDbStorage, 'moveFile');
      const user = userEvent.setup();
      const { input } = await renderField();

      if (typed) await user.keyboard(typed);
      else await user.clear(input);
      await user.keyboard('{Enter}');

      expect(screen.getByText(error)).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();

      act(() => {
        input.blur();
      });
      expect(onDone).toHaveBeenCalledWith(false);
      expect(rename).not.toHaveBeenCalled();
    },
  );

  it('shows a failed rename and stays open, so the name can be changed', async () => {
    vi.spyOn(indexedDbStorage, 'moveFile').mockRejectedValueOnce(new Error('The storage is blocked'));
    const user = userEvent.setup();
    const { input } = await renderField();

    await user.keyboard('orders{Enter}');

    expect(await screen.findByText('The storage is blocked')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(input).not.toHaveAttribute('readonly');
  });

  it('renames once when the field loses the focus right after Enter', async () => {
    const rename = vi.spyOn(indexedDbStorage, 'moveFile');
    const user = userEvent.setup();
    const { input } = await renderField();

    await user.keyboard('orders{Enter}');
    act(() => {
      input.blur();
    });

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledTimes(1);
    });
    expect(rename).toHaveBeenCalledTimes(1);
  });

  it('does not report a rename that finishes after the field was replaced', async () => {
    let release: () => void = () => undefined;
    const realRename = indexedDbStorage.moveFile.bind(indexedDbStorage);
    const rename = vi.spyOn(indexedDbStorage, 'moveFile').mockImplementation(async (path, newPath) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return realRename(path, newPath);
    });
    const user = userEvent.setup();
    const { input, unmount } = await renderField();

    await user.keyboard('orders');
    act(() => {
      input.blur();
    });
    await waitFor(() => {
      expect(rename).toHaveBeenCalled();
    });
    // Another file's field takes this one's place while the rename is still running
    unmount();
    await act(async () => {
      release();
    });

    await waitFor(async () => {
      await expectStoredAt('main-flow', 'integrations/orders.camel.yaml');
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('leaves Enter and Escape to an IME composition', async () => {
    const rename = vi.spyOn(indexedDbStorage, 'moveFile');
    const { input } = await renderField();

    fireEvent.change(input, { target: { value: 'orders.camel.yaml' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });

    expect(onDone).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
  });
});
