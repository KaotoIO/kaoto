import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UriImportSource } from './UriImportSource';

describe('UriImportSource', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const mockOnSchemaLoaded = vi.fn();

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
      text: vi.fn().mockResolvedValue(specContent),
    } as unknown as Response);
    mockOnSchemaLoaded.mockReturnValue({});

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

  it('shows error and hides "Loaded" when onSchemaLoaded returns an error', async () => {
    const specContent = '<html>Not Found</html>';
    fetchSpy.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(specContent),
    } as unknown as Response);
    mockOnSchemaLoaded.mockReturnValue({ error: 'Invalid OpenAPI specification.' });

    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'http://example.com/spec.yaml' } });

    const fetchButton = screen.getByRole('button', { name: /fetch/i });
    fireEvent.click(fetchButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid OpenAPI specification.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Loaded')).not.toBeInTheDocument();
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
      expect(screen.getByText(/Failed to fetch specification \(HTTP 404\)/)).toBeInTheDocument();
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
          setTimeout(() => {
            resolve({
              ok: true,
              text: vi.fn().mockResolvedValue('openapi: 3.0.0'),
            } as unknown as Response);
          }, 100),
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

  it('starts with the URI kept by the wizard and reports changes', () => {
    const onUriChange = vi.fn();
    render(
      <UriImportSource
        onSchemaLoaded={mockOnSchemaLoaded}
        initialUri="http://example.com/spec.yaml"
        onUriChange={onUriChange}
      />,
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('http://example.com/spec.yaml');

    fireEvent.change(input, { target: { value: 'http://example.com/other.yaml' } });

    expect(onUriChange).toHaveBeenCalledWith('http://example.com/other.yaml');
  });

  it('shows the specification already loaded by the wizard', () => {
    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} initialUri="http://example.com/spec.yaml" loaded />);

    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });

  it('ignores a fetch that finishes after the source was unmounted', async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    fetchSpy.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );

    const { unmount } = render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'http://example.com/spec.yaml' } });
    fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
    unmount();

    await act(async () => {
      resolveResponse({ ok: true, text: () => Promise.resolve('openapi: 3.0.0') } as Response);
      await Promise.resolve();
    });

    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
  });

  it('accepts a fetch that finishes while the source is still shown', async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    fetchSpy.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );
    mockOnSchemaLoaded.mockReturnValue({});

    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'http://example.com/spec.yaml' } });
    fireEvent.click(screen.getByRole('button', { name: /fetch/i }));

    await act(async () => {
      resolveResponse({ ok: true, text: () => Promise.resolve('openapi: 3.0.0') } as Response);
    });

    expect(mockOnSchemaLoaded).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Loaded')).toBeInTheDocument();
  });

  it('ignores a failed fetch that finishes after the source was unmounted', async () => {
    let rejectResponse: (reason: Error) => void = () => undefined;
    fetchSpy.mockReturnValue(
      new Promise<Response>((_resolve, reject) => {
        rejectResponse = reject;
      }),
    );

    const { unmount } = render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'http://example.com/spec.yaml' } });
    fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
    unmount();

    await act(async () => {
      rejectResponse(new Error('network down'));
      await Promise.resolve();
    });

    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
  });

  it('discards the loaded specification when the URI is edited', () => {
    const onCleared = vi.fn();
    render(
      <UriImportSource
        onSchemaLoaded={mockOnSchemaLoaded}
        onCleared={onCleared}
        initialUri="http://example.com/a.yaml"
        loaded
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'http://example.com/b.yaml' } });

    expect(onCleared).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Loaded')).not.toBeInTheDocument();
  });

  it('does not discard anything when the URI is edited before a specification was loaded', () => {
    const onCleared = vi.fn();
    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} onCleared={onCleared} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'http://example.com/b.yaml' } });

    expect(onCleared).not.toHaveBeenCalled();
  });

  it('ignores a fetch that finishes after the URI was edited', async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    fetchSpy.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );

    render(<UriImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'http://example.com/a.yaml' } });
    fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'http://example.com/b.yaml' } });

    await act(async () => {
      resolveResponse({ ok: true, text: () => Promise.resolve('openapi: 3.0.0') } as Response);
    });

    expect(mockOnSchemaLoaded).not.toHaveBeenCalled();
    expect(screen.queryByText('Loaded')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fetch/i })).toBeEnabled();
  });
});
