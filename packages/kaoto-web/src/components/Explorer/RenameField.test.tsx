import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { StrictMode } from 'react';

import { ProjectFile } from '../../context/FilesContextDefinition';
import { filesStore } from '../../services/files/files.store';
import { storeTestFiles, withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { RenameField } from './RenameField';

const storedFile = async (id: string) => (await filesStore.getFiles()).find((file) => file.id === id);

describe('RenameField', () => {
  /** The file as the files context hands it out: its id is its path */
  const file: ProjectFile = {
    id: 'integrations/main-flow.camel.yaml',
    path: 'integrations/main-flow.camel.yaml',
    content: 'x',
  };
  const onDone = vi.fn();
  const onRenamed = vi.fn();

  beforeEach(async () => {
    resetTestIndexedDB();
    await storeTestFiles([
      { id: 'main-flow', path: 'integrations/main-flow.camel.yaml', content: 'x' },
      { id: 'other', path: 'integrations/other.camel.yaml', content: '' },
    ]);
    onRenamed.mockReset();
    onDone.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderField = (strict = false) => {
    const field = withFiles(<RenameField file={file} onDone={onDone} onRenamed={onRenamed} />);
    const result = render(strict ? <StrictMode>{field}</StrictMode> : field);
    return { ...result, input: screen.getByRole('textbox', { name: 'Rename file' }) as HTMLInputElement };
  };

  it.each([false, true])('focuses the field and selects the name before its first dot (StrictMode %s)', (strict) => {
    const { input } = renderField(strict);

    expect(input).toHaveFocus();
    expect(input).toHaveValue('main-flow.camel.yaml');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('main-flow'.length);
  });

  it.each([false, true])(
    'renames the file on Enter and reports it once by keyboard (StrictMode %s)',
    async (strict) => {
      const user = userEvent.setup();
      renderField(strict);

      await user.keyboard('orders{Enter}');

      await waitFor(() => {
        expect(onDone).toHaveBeenCalledTimes(1);
      });
      expect(onDone).toHaveBeenCalledWith(true, 'integrations/orders.camel.yaml');
      expect(onRenamed).toHaveBeenCalledWith('integrations/main-flow.camel.yaml', 'integrations/orders.camel.yaml');
      expect((await storedFile('main-flow'))?.path).toBe('integrations/orders.camel.yaml');
    },
  );

  it('renames the file when the field loses the focus and reports it as not by keyboard', async () => {
    const user = userEvent.setup();
    const { input } = renderField();

    await user.keyboard('orders');
    act(() => {
      input.blur();
    });

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(false, 'integrations/orders.camel.yaml');
    });
    expect((await storedFile('main-flow'))?.path).toBe('integrations/orders.camel.yaml');
  });

  it('cancels on Escape without renaming', async () => {
    const rename = vi.spyOn(filesStore, 'renameFileAt');
    const user = userEvent.setup();
    renderField();

    await user.keyboard('orders{Escape}');

    expect(onDone).toHaveBeenCalledWith(true, undefined);
    expect(rename).not.toHaveBeenCalled();
  });

  it('does not rename when the field loses the focus after Escape, as it does while it is removed', async () => {
    const rename = vi.spyOn(filesStore, 'renameFileAt');
    const user = userEvent.setup();
    const { input } = renderField();

    await user.keyboard('orders{Escape}');
    act(() => {
      input.blur();
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(rename).not.toHaveBeenCalled();
  });

  it('closes without writing when the name is unchanged', async () => {
    const rename = vi.spyOn(filesStore, 'renameFileAt');
    const user = userEvent.setup();
    renderField();

    await user.keyboard('{Enter}');

    expect(onDone).toHaveBeenCalledWith(true, undefined);
    expect(rename).not.toHaveBeenCalled();
  });

  it.each([
    ['a taken name', 'other', 'A file or folder with that name already exists'],
    ['an empty name', '', 'Enter a file name'],
  ])(
    'keeps the field open with the error for %s on Enter, and gives up when the field loses the focus',
    async (_, typed, error) => {
      const rename = vi.spyOn(filesStore, 'renameFileAt');
      const user = userEvent.setup();
      const { input } = renderField();

      if (typed) await user.keyboard(typed);
      else await user.clear(input);
      await user.keyboard('{Enter}');

      expect(screen.getByText(error)).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();

      act(() => {
        input.blur();
      });
      expect(onDone).toHaveBeenCalledWith(false, undefined);
      expect(rename).not.toHaveBeenCalled();
    },
  );

  it('shows a failed rename and stays open, so the name can be changed', async () => {
    vi.spyOn(filesStore, 'renameFileAt').mockRejectedValueOnce(new Error('The storage is blocked'));
    const user = userEvent.setup();
    const { input } = renderField();

    await user.keyboard('orders{Enter}');

    expect(await screen.findByText('The storage is blocked')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(input).not.toHaveAttribute('readonly');
  });

  it('renames once when the field loses the focus right after Enter', async () => {
    const rename = vi.spyOn(filesStore, 'renameFileAt');
    const user = userEvent.setup();
    const { input } = renderField();

    await user.keyboard('orders{Enter}');
    act(() => {
      input.blur();
    });

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledTimes(1);
    });
    expect(rename).toHaveBeenCalledTimes(1);
  });

  it('reports a rename that finishes after the field was replaced only as renamed, not as done', async () => {
    let release: () => void = () => undefined;
    const realRename = filesStore.renameFileAt.bind(filesStore);
    const rename = vi.spyOn(filesStore, 'renameFileAt').mockImplementation(async (path, newPath) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return realRename(path, newPath);
    });
    const user = userEvent.setup();
    const { input, unmount } = renderField();

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
      expect((await storedFile('main-flow'))?.path).toBe('integrations/orders.camel.yaml');
    });
    // The Explorer still moves the open file along
    expect(onRenamed).toHaveBeenCalledWith('integrations/main-flow.camel.yaml', 'integrations/orders.camel.yaml');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('leaves Enter and Escape to an IME composition', () => {
    const rename = vi.spyOn(filesStore, 'renameFileAt');
    const { input } = renderField();

    fireEvent.change(input, { target: { value: 'orders.camel.yaml' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });

    expect(onDone).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
  });
});
