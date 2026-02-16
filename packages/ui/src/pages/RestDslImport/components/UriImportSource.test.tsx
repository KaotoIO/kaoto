import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UriImportSource } from './UriImportSource';

describe('UriImportSource', () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');
  const mockOnSchemaLoaded = jest.fn();

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('renders URI input and fetch button', () => {
    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fetch/i })).toBeInTheDocument();
  });

  it('fetch button is disabled when URI is empty', () => {
    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const fetchButton = screen.getByRole('button', { name: /fetch/i });
    expect(fetchButton).toBeDisabled();
  });

  it('fetch button is enabled when URI is entered', () => {
    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'http://example.com/spec.yaml' } });

    const fetchButton = screen.getByRole('button', { name: /fetch/i });
    expect(fetchButton).not.toBeDisabled();
  });

  it('calls onSchemaLoaded when fetch is successful', async () => {
    const specContent = 'openapi: 3.0.0';
    fetchSpy.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(specContent),
    } as unknown as Response);

    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = screen.getByRole('textbox');
    const uri = 'http://example.com/spec.yaml';

    fireEvent.change(input, { target: { value: uri } });

    const fetchButton = screen.getByRole('button', { name: /fetch/i });
    fireEvent.click(fetchButton);

    await waitFor(() => {
      expect(mockOnSchemaLoaded).toHaveBeenCalledWith({
        schema: specContent,
        source: 'uri',
        sourceIdentifier: uri,
      });
    });

    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'http://example.com/notfound.yaml' } });

    const fetchButton = screen.getByRole('button', { name: /fetch/i });
    fireEvent.click(fetchButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch specification \(404\)/)).toBeInTheDocument();
    });
  });

  it('shows error message when network error occurs', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'http://example.com/spec.yaml' } });

    const fetchButton = screen.getByRole('button', { name: /fetch/i });
    fireEvent.click(fetchButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows error when URI is empty and fetch is attempted', () => {
    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.change(input, { target: { value: '' } });

    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
  });

  it('disables fetch button while loading', async () => {
    fetchSpy.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                text: jest.fn().mockResolvedValue('openapi: 3.0.0'),
              } as unknown as Response),
            100,
          ),
        ),
    );

    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'http://example.com/spec.yaml' } });

    const fetchButton = screen.getByRole('button', { name: /fetch/i });
    fireEvent.click(fetchButton);

    expect(fetchButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnSchemaLoaded).toHaveBeenCalled();
    });
  });

  it('shows generic error when fetch throws a non-Error value', async () => {
    fetchSpy.mockRejectedValue('non-error rejection');

    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'http://example.com/spec.yaml' } });

    const fetchButton = screen.getByRole('button', { name: /fetch/i });
    fireEvent.click(fetchButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch the specification.')).toBeInTheDocument();
    });
  });
});
