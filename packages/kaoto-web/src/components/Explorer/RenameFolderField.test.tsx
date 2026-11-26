import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';

import { indexedDbStorage } from '../../services/files/indexed-db-storage';
import { useFilesUiStore } from '../../store/files/use-files-ui-store';
import { storedPaths, storeTestFiles, withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { RenameFolderField } from './RenameFolderField';

/** The field for the stored entry at the path, once the files are loaded; it keeps the entry when it moves */
const FieldFor = ({ path, onDone }: { path: string; onDone: (byKeyboard: boolean) => void }) => {
  const entries = useFilesUiStore((state) => state.entries);
  const [key, setKey] = useState<string>();
  const entry = entries.find((candidate) => (key ? candidate.key === key : candidate.path === path));
  if (entry && !key) setKey(entry.key);
  return entry ? <RenameFolderField folder={entry} onDone={onDone} /> : null;
};

describe('RenameFolderField', () => {
  const onDone = vi.fn();

  beforeEach(async () => {
    resetTestIndexedDB();
    await storeTestFiles([
      { id: 'rest-api', path: 'integrations/routes/rest-api.camel.yaml', content: '' },
      { id: 'kafka', path: 'integrations/routes/async/kafka.camel.yaml', content: '' },
      { id: 'other', path: 'integrations/other/flow.camel.yaml', content: '' },
      { id: 'schema', path: 'resources/schema.xsd', content: '' },
    ]);
    onDone.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderField = async (folderPath = 'integrations/routes') => {
    const view = render(withFiles(<FieldFor path={folderPath} onDone={onDone} />));
    return { input: (await screen.findByRole('textbox', { name: 'Rename folder' })) as HTMLInputElement, ...view };
  };

  it('opens with the folder name, focused and selected', async () => {
    const { input } = await renderField();

    expect(input).toHaveValue('routes');
    expect(input).toHaveFocus();
    expect(input.selectionEnd).toBe('routes'.length);
  });

  it('renames the folder with everything in it and reports the new path', async () => {
    const user = userEvent.setup();
    await renderField();

    await user.keyboard('flows{Enter}');

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(true);
    });
    expect(await storedPaths()).toEqual([
      'integrations/flows/async/kafka.camel.yaml',
      'integrations/flows/rest-api.camel.yaml',
      'integrations/other/flow.camel.yaml',
      'resources/schema.xsd',
    ]);
  });

  it('renames a folder at the root', async () => {
    const user = userEvent.setup();
    await renderField('resources');

    await user.keyboard('schemas{Enter}');

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(true);
    });
    expect(await storedPaths()).toContain('schemas/schema.xsd');
  });

  it('closes without writing when the name is unchanged', async () => {
    const rename = vi.spyOn(indexedDbStorage, 'moveFolder');
    const user = userEvent.setup();
    await renderField();

    await user.keyboard('{Enter}');

    expect(onDone).toHaveBeenCalledWith(true);
    expect(rename).not.toHaveBeenCalled();
  });

  it('keeps the field open with an error for the name of a sibling folder', async () => {
    const rename = vi.spyOn(indexedDbStorage, 'moveFolder');
    const user = userEvent.setup();
    await renderField();

    await user.keyboard('other{Enter}');

    expect(screen.getByText('A file or folder with that name already exists')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
  });

  it('keeps the field open with an error for a name with a slash', async () => {
    const user = userEvent.setup();
    const { input } = await renderField();

    await user.keyboard('a/b{Enter}');

    expect(input).toBeInvalid();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('reports a cancelled rename without a path', async () => {
    const rename = vi.spyOn(indexedDbStorage, 'moveFolder');
    const user = userEvent.setup();
    await renderField();

    await user.keyboard('flows{Escape}');

    expect(onDone).toHaveBeenCalledWith(true);
    expect(rename).not.toHaveBeenCalled();
  });

  it('reports the rename once it is stored, also when the field is gone by then', async () => {
    let finishRename: () => void = () => {};
    const rename = indexedDbStorage.moveFolder.bind(indexedDbStorage);
    vi.spyOn(indexedDbStorage, 'moveFolder').mockImplementation(
      (from, to) =>
        new Promise((resolve, reject) => {
          finishRename = () => {
            rename(from, to).then(resolve, reject);
          };
        }),
    );
    const user = userEvent.setup();
    const { unmount } = await renderField();
    await user.keyboard('flows{Enter}');

    unmount();
    finishRename();

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(true);
    });
  });
});
