import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { filesStore } from '../../services/files/files.store';
import { storeTestFiles, withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { RenameFolderField } from './RenameFolderField';

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

  const renderField = (folderPath = 'integrations/routes') => {
    render(withFiles(<RenameFolderField folderPath={folderPath} onDone={onDone} />));
    return screen.getByRole('textbox', { name: 'Rename folder' }) as HTMLInputElement;
  };

  const storedPaths = async () => (await filesStore.getFiles()).map((file) => file.path).sort();

  it('opens with the folder name, focused and selected', () => {
    const input = renderField();

    expect(input).toHaveValue('routes');
    expect(input).toHaveFocus();
    expect(input.selectionEnd).toBe('routes'.length);
  });

  it('renames the folder with everything in it and reports the new path', async () => {
    const user = userEvent.setup();
    renderField();

    await user.keyboard('flows{Enter}');

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(true, 'integrations/flows');
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
    renderField('resources');

    await user.keyboard('schemas{Enter}');

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(true, 'schemas');
    });
    expect(await storedPaths()).toContain('schemas/schema.xsd');
  });

  it('closes without writing when the name is unchanged', async () => {
    const rename = vi.spyOn(filesStore, 'renameFolder');
    const user = userEvent.setup();
    renderField();

    await user.keyboard('{Enter}');

    expect(onDone).toHaveBeenCalledWith(true, undefined);
    expect(rename).not.toHaveBeenCalled();
  });

  it('keeps the field open with an error for the name of a sibling folder', async () => {
    const rename = vi.spyOn(filesStore, 'renameFolder');
    const user = userEvent.setup();
    renderField();

    await user.keyboard('other{Enter}');

    expect(screen.getByText('A file or folder with that name already exists')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
  });

  it('keeps the field open with an error for a name with a slash', async () => {
    const user = userEvent.setup();
    const input = renderField();

    await user.keyboard('a/b{Enter}');

    expect(input).toBeInvalid();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('reports a cancelled rename without a path', async () => {
    const rename = vi.spyOn(filesStore, 'renameFolder');
    const user = userEvent.setup();
    renderField();

    await user.keyboard('flows{Escape}');

    expect(onDone).toHaveBeenCalledWith(true, undefined);
    expect(rename).not.toHaveBeenCalled();
  });
});
