import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { FileImportSource } from './FileImportSource';

describe('FileImportSource', () => {
  const mockOnSchemaLoaded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file upload component', () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const fileUpload = container.querySelector('#openapi-file-upload');
    expect(fileUpload).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Drag and drop a file or upload one')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />)).not.toThrow();
  });

  it('accepts required props', () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    expect(container).toBeInTheDocument();
  });

  it('renders clear button in disabled state initially', () => {
    render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const clearButton = screen.getByRole('button', { name: /clear/i });
    expect(clearButton).toBeDisabled();
  });

  it('renders textarea for file content', () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const textarea = container.querySelector('#openapi-file-upload') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('does not show success message initially', () => {
    render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    expect(screen.queryByText('Schema loaded successfully')).not.toBeInTheDocument();
  });

  it('does not show error message initially', () => {
    render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('configures file upload to accept JSON and YAML files', () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const hiddenFileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    expect(hiddenFileInput).toBeInTheDocument();
    expect(hiddenFileInput).toHaveAttribute('accept');

    const acceptAttr = hiddenFileInput.getAttribute('accept');
    expect(acceptAttr).toContain('.json');
    expect(acceptAttr).toContain('.yaml');
    expect(acceptAttr).toContain('.yml');
  });

  it('renders with correct component structure', () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);

    // Check for main file upload container
    const fileUploadContainer = container.querySelector('.pf-v6-c-file-upload');
    expect(fileUploadContainer).toBeInTheDocument();

    // Check for file select section
    const fileSelect = container.querySelector('.pf-v6-c-file-upload__file-select');
    expect(fileSelect).toBeInTheDocument();

    // Check for file details section (textarea)
    const fileDetails = container.querySelector('.pf-v6-c-file-upload__file-details');
    expect(fileDetails).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);

    const textarea = container.querySelector('#openapi-file-upload');
    expect(textarea).toHaveAttribute('aria-label', 'File upload');
    expect(textarea).toHaveAttribute('aria-invalid', 'false');

    const filenameInput = container.querySelector('#openapi-file-upload-filename');
    expect(filenameInput).toHaveAttribute('aria-label', 'Drag and drop a file or upload one');
  });

  it('renders upload button with correct text', () => {
    render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    expect(uploadButton).toHaveTextContent('Upload');
  });

  it('renders clear button with correct text', () => {
    render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const clearButton = screen.getByRole('button', { name: /clear/i });
    expect(clearButton).toHaveTextContent('Clear');
  });

  it('calls onSchemaLoaded and shows success when a file is uploaded', async () => {
    const fileContent = '{"openapi": "3.0.0"}';
    const file = new File([fileContent], 'spec.json', { type: 'application/json' });

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnSchemaLoaded).toHaveBeenCalledWith({
        schema: fileContent,
        source: 'file',
        sourceIdentifier: 'spec.json',
      });
    });

    expect(screen.getByText('Schema loaded successfully')).toBeInTheDocument();
  });

  it('shows error when onSchemaLoaded throws', async () => {
    mockOnSchemaLoaded.mockImplementation(() => {
      throw new Error('Parse failed');
    });

    const file = new File(['invalid content'], 'bad.json', { type: 'application/json' });

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Parse failed')).toBeInTheDocument();
    });

    expect(screen.queryByText('Schema loaded successfully')).not.toBeInTheDocument();
  });

  it('clears file state when clear button is clicked', async () => {
    const fileContent = '{"openapi": "3.0.0"}';
    const file = new File([fileContent], 'spec.json', { type: 'application/json' });

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const textarea = container.querySelector('#openapi-file-upload') as HTMLTextAreaElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnSchemaLoaded).toHaveBeenCalled();
    });

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(textarea).toHaveValue('');
    expect(screen.queryByText('Schema loaded successfully')).not.toBeInTheDocument();
  });

  it('allows manual text input in the textarea', () => {
    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const textarea = container.querySelector('#openapi-file-upload') as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'openapi: 3.0.0' } });

    expect(textarea.value).toBe('openapi: 3.0.0');
  });

  it('shows error when file content is empty', async () => {
    const file = new File([''], 'empty.json', { type: 'application/json' });

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('No file content to load')).toBeInTheDocument();
    });

    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
  });

  it('shows generic error message when onSchemaLoaded throws non-Error', async () => {
    mockOnSchemaLoaded.mockImplementation(() => {
      throw 'string error';
    });

    const file = new File(['some content'], 'spec.json', { type: 'application/json' });

    const { container } = render(<FileImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Unable to read the uploaded specification.')).toBeInTheDocument();
    });
  });
});
