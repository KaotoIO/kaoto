import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageTemplateActions } from './MessageTemplateActions';

const template = { format: 'kaoto-message', version: 1, bodyType: 'text', body: 'saved', headers: [] };
const draft = { bodyType: 'text' as const, body: 'draft', bodyFile: null, headers: [] };
const readText = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.readAsText(blob);
  });

beforeEach(() => {
  // JSDOM does not implement File.text(). Keep real FileReader support for the test adapter.
  vi.stubGlobal(
    'File',
    class extends File {
      text() {
        return readText(this);
      }
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MessageTemplateActions', () => {
  it('downloads the complete message as JSON and releases the object URL', async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:message');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<MessageTemplateActions value={draft} onImport={vi.fn()} onImportingChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export message' }));
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'File name' }), { target: { value: ' order-message ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.instances[0]).toHaveProperty('download', 'order-message.json');
    expect(screen.queryByRole('textbox', { name: 'File name' })).not.toBeInTheDocument();
    const blob = createObjectURL.mock.calls[0][0];
    expect(JSON.parse(await readText(blob))).toEqual({ ...template, body: 'draft' });
    await waitFor(() => {
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:message');
    });
  });

  it('keeps a single JSON extension and supports canceling the name entry', async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:message'), revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<MessageTemplateActions value={draft} onImport={vi.fn()} onImportingChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export message' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'File name' }), { target: { value: 'orders.JSON' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel export' }));
    expect(click).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'File name' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export message' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(click.mock.instances[0]).toHaveProperty('download', 'orders.json');
    await waitFor(() => {
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:message');
    });
  });

  it.each(['   ', '.json', '../orders', 'orders/test', 'orders\\test', 'orders?'])(
    'rejects invalid file name %s',
    (name) => {
      render(<MessageTemplateActions value={draft} onImport={vi.fn()} onImportingChange={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Export message' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'File name' }), { target: { value: name } });
      expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    },
  );

  it('imports only a fully parsed message and reports malformed files', async () => {
    const onImport = vi.fn();
    const onImportingChange = vi.fn();
    const onRememberFile = vi.fn();
    render(
      <MessageTemplateActions
        value={draft}
        onImport={onImport}
        onImportingChange={onImportingChange}
        onRememberFile={onRememberFile}
      />,
    );
    const input = screen.getByTestId('send-message-template-input');
    fireEvent.change(input, { target: { files: [new File([JSON.stringify(template)], 'message.json')] } });
    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(template);
    });
    expect(onImportingChange).toHaveBeenLastCalledWith(false);
    expect(onRememberFile).toHaveBeenCalledOnce();
    const remembered = onRememberFile.mock.calls[0][0] as File;
    expect(remembered.name).toBe('message.json');
    expect(JSON.parse(await readText(remembered))).toEqual(template);
    onImport.mockClear();
    fireEvent.change(input, { target: { files: [new File(['{'], 'invalid.json')] } });
    await screen.findByText('The selected file is not valid JSON.');
    expect(onImport).not.toHaveBeenCalled();
    expect(onRememberFile).toHaveBeenCalledOnce();
  });

  it('imports a recent file including its binary body without opening the file picker', async () => {
    const saved = {
      ...template,
      bodyType: 'file',
      bodyFile: { name: 'payload.bin', content: 'AP+A', size: 3, type: 'application/octet-stream' },
    };
    const file = new File([JSON.stringify(saved)], 'binary-message.json');
    const onImport = vi.fn();
    const onRememberFile = vi.fn();
    render(
      <MessageTemplateActions
        value={draft}
        onImport={onImport}
        onImportingChange={vi.fn()}
        recentFiles={[file]}
        onRememberFile={onRememberFile}
      />,
    );
    const pickerClick = vi.spyOn(HTMLInputElement.prototype, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Import binary-message.json' }));
    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(expect.objectContaining({ bodyFile: saved.bodyFile }));
    });
    expect(onRememberFile).toHaveBeenCalledOnce();
    expect(pickerClick).not.toHaveBeenCalled();
  });

  it('disables recent imports while sending or reading another file', () => {
    vi.spyOn(File.prototype, 'text').mockImplementation(() => new Promise(() => {}));
    const props = {
      value: draft,
      onImport: vi.fn(),
      onImportingChange: vi.fn(),
      recentFiles: [new File([JSON.stringify(template)], 'recent.json')],
    };
    const { rerender } = render(<MessageTemplateActions {...props} disabled />);
    expect(screen.getByRole('button', { name: 'Import recent.json' })).toBeDisabled();
    rerender(<MessageTemplateActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Import recent.json' }));
    expect(screen.getByRole('button', { name: 'Import recent.json' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Importing message...' })).toBeDisabled();
  });

  it('reports file read errors without importing anything', async () => {
    vi.spyOn(File.prototype, 'text').mockRejectedValue(new Error('The message file could not be read.'));
    const onImport = vi.fn();
    render(<MessageTemplateActions value={draft} onImport={onImport} onImportingChange={vi.fn()} />);
    fireEvent.change(screen.getByTestId('send-message-template-input'), {
      target: { files: [new File([''], 'x.json')] },
    });
    expect(await screen.findByText('The message file could not be read.')).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('ignores a pending read after the dialog closes', async () => {
    let finishRead: (value: string) => void = () => {};
    vi.spyOn(File.prototype, 'text').mockImplementation(
      () =>
        new Promise((resolve) => {
          finishRead = resolve;
        }),
    );
    const onImport = vi.fn();
    const onRememberFile = vi.fn();
    const onImportingChange = vi.fn();
    const { unmount } = render(
      <MessageTemplateActions
        value={draft}
        onImport={onImport}
        onImportingChange={onImportingChange}
        onRememberFile={onRememberFile}
      />,
    );
    fireEvent.change(screen.getByTestId('send-message-template-input'), {
      target: { files: [new File([''], 'x.json')] },
    });
    unmount();
    await act(async () => {
      finishRead(JSON.stringify(template));
    });
    expect(onImport).not.toHaveBeenCalled();
    expect(onRememberFile).not.toHaveBeenCalled();
    expect(onImportingChange).toHaveBeenLastCalledWith(false);
  });

  it('disables export until file mode has a file body', () => {
    render(
      <MessageTemplateActions value={{ ...draft, bodyType: 'file' }} onImport={vi.fn()} onImportingChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Export message' })).toBeDisabled();
  });
});
