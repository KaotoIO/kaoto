import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { FileImportSource } from './FileImportSource';

describe('FileImportSource', () => {
  const mockOnSchemaLoaded = vi.fn();
  const DROP_LABEL = 'Drag and drop files here or click to upload';
  const HELPER_TEXT = 'Supported file types are .json, .yaml and .yml.';

  const uploadFile = (container: HTMLElement, file: File) => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the drop container and no status messages initially', () => {
    render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);

    expect(screen.getByRole('button', { name: DROP_LABEL })).toBeInTheDocument();
    expect(screen.getByText(HELPER_TEXT)).toBeInTheDocument();
    expect(screen.queryByText('Schema loaded successfully')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('accepts JSON and YAML files', () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    expect(input).toHaveAttribute('accept', '.json,.yaml,.yml');
    expect(input).not.toHaveAttribute('multiple');
  });

  it('calls onSchemaLoaded and shows success when a file is uploaded', async () => {
    const fileContent = '{"openapi": "3.0.0"}';
    mockOnSchemaLoaded.mockReturnValue({});

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, new File([fileContent], 'spec.json', { type: 'application/json' }));

    await waitFor(() => {
      expect(mockOnSchemaLoaded).toHaveBeenCalledWith({
        schema: fileContent,
        source: 'file',
        sourceIdentifier: 'spec.json',
      });
    });

    expect(await screen.findByText('Schema loaded successfully')).toBeInTheDocument();
    expect(screen.getByText('spec.json')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: DROP_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByText(HELPER_TEXT)).not.toBeInTheDocument();
  });

  it('shows success when onSchemaLoaded returns no value', async () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, new File(['{"openapi": "3.0.0"}'], 'spec.json', { type: 'application/json' }));

    expect(await screen.findByText('Schema loaded successfully')).toBeInTheDocument();
  });

  it('shows the error and hides success when onSchemaLoaded returns an error', async () => {
    mockOnSchemaLoaded.mockReturnValue({ error: 'Invalid OpenAPI specification.' });

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, new File(['<html></html>'], 'bad.json', { type: 'application/json' }));

    expect(await screen.findByText('Invalid OpenAPI specification.')).toBeInTheDocument();
    expect(screen.queryByText('Schema loaded successfully')).not.toBeInTheDocument();
  });

  it('shows the error when onSchemaLoaded throws', async () => {
    mockOnSchemaLoaded.mockImplementation(() => {
      throw new Error('Parse failed');
    });

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, new File(['invalid content'], 'bad.json', { type: 'application/json' }));

    expect(await screen.findByText('Parse failed')).toBeInTheDocument();
    expect(screen.queryByText('Schema loaded successfully')).not.toBeInTheDocument();
  });

  it('shows a generic error when onSchemaLoaded throws a non-Error', async () => {
    mockOnSchemaLoaded.mockImplementation(() => {
      throw 'string error';
    });

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, new File(['some content'], 'spec.json', { type: 'application/json' }));

    expect(await screen.findByText('Unable to read the uploaded specification.')).toBeInTheDocument();
  });

  it('shows an error when the file content is empty', async () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, new File([''], 'empty.json', { type: 'application/json' }));

    expect(await screen.findByText('No file content to load')).toBeInTheDocument();
    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
  });

  it('rejects unsupported file types without reading them', async () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, new File(['x'], 'spec.txt', { type: 'text/plain' }));

    expect(await screen.findByText('Unsupported file type. Accepted types: .json, .yaml, .yml.')).toBeInTheDocument();
    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
  });

  it('ignores a change event without files', () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });

    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: DROP_LABEL })).toBeInTheDocument();
  });

  it('removes the file and shows the drop container again when the file is deleted', async () => {
    mockOnSchemaLoaded.mockReturnValue({});

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, new File(['{"openapi": "3.0.0"}'], 'spec.json', { type: 'application/json' }));
    await screen.findByText('Schema loaded successfully');

    fireEvent.click(screen.getByRole('button', { name: /remove file/i }));

    expect(screen.getByRole('button', { name: DROP_LABEL })).toBeInTheDocument();
    expect(screen.queryByText('Schema loaded successfully')).not.toBeInTheDocument();
    expect(screen.queryByText('spec.json')).not.toBeInTheDocument();
  });

  it('shows an error when a file without an extension is dropped', () => {
    render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);

    fireEvent.drop(screen.getByRole('button', { name: DROP_LABEL }), {
      dataTransfer: { items: [], files: [new File(['x'], 'openapi_')] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Unsupported file type. Accepted types: .json, .yaml, .yml.');
    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: DROP_LABEL })).toBeInTheDocument();
  });

  it('shows an error when a file without an extension is picked', () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);

    uploadFile(container, new File(['x'], 'openapi_'));

    expect(screen.getByRole('alert')).toHaveTextContent('Unsupported file type.');
    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
  });

  it('notifies when the file is removed', async () => {
    mockOnSchemaLoaded.mockReturnValue({});
    const onCleared = vi.fn();

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} onCleared={onCleared} />);
    uploadFile(container, new File(['{"openapi": "3.0.0"}'], 'spec.json', { type: 'application/json' }));
    await screen.findByText('Schema loaded successfully');

    fireEvent.click(screen.getByRole('button', { name: /remove file/i }));

    expect(onCleared).toHaveBeenCalledTimes(1);
  });

  it('moves focus to the uploader when the file is removed', async () => {
    mockOnSchemaLoaded.mockReturnValue({});

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, new File(['{"openapi": "3.0.0"}'], 'spec.json', { type: 'application/json' }));
    await screen.findByText('Schema loaded successfully');

    fireEvent.click(screen.getByRole('button', { name: /remove file/i }));

    expect(screen.getByRole('button', { name: DROP_LABEL })).toHaveFocus();
  });

  it('shows the file already loaded by the wizard', () => {
    render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} loadedFilename="spec.json" />);

    expect(screen.getByText('spec.json')).toBeInTheDocument();
    expect(screen.getByText('Schema loaded successfully')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: DROP_LABEL })).not.toBeInTheDocument();
  });

  it('ignores a read that finishes after the source was unmounted', async () => {
    let resolveText: (content: string) => void = () => undefined;
    const file = new File(['{"openapi": "3.0.0"}'], 'spec.json', { type: 'application/json' });
    vi.spyOn(file, 'text').mockReturnValue(
      new Promise<string>((resolve) => {
        resolveText = resolve;
      }),
    );

    const { container, unmount } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, file);
    unmount();

    await act(async () => {
      resolveText('{"openapi": "3.0.0"}');
      await Promise.resolve();
    });

    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
  });

  it('ignores a failed read that finishes after the source was unmounted', async () => {
    let rejectText: (reason: Error) => void = () => undefined;
    const file = new File(['{"openapi": "3.0.0"}'], 'spec.json', { type: 'application/json' });
    vi.spyOn(file, 'text').mockReturnValue(
      new Promise<string>((_resolve, reject) => {
        rejectText = reject;
      }),
    );

    const { container, unmount } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    uploadFile(container, file);
    unmount();

    await act(async () => {
      rejectText(new Error('read failed'));
      await Promise.resolve();
    });

    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
  });
});
