import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApicurioImportSource } from './ApicurioImportSource';

describe('ApicurioImportSource', () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');
  const mockOnSchemaLoaded = jest.fn();
  const registryUrl = 'http://registry.example.com';

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('shows message when registry URL is not configured', () => {
    render(<ApicurioImportSource onSchemaLoaded={mockOnSchemaLoaded} />);
    expect(screen.getByText(/Configure the Apicurio Registry URL in Settings/)).toBeInTheDocument();
  });

  it('fetches artifacts on mount when registry URL is provided', async () => {
    const mockArtifacts = {
      artifacts: [
        { id: 'artifact-1', name: 'API Spec 1', type: 'OPENAPI' },
        { id: 'artifact-2', name: 'API Spec 2', type: 'OPENAPI' },
        { id: 'artifact-3', name: 'Schema', type: 'AVRO' },
      ],
    };

    fetchSpy.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockArtifacts),
    } as unknown as Response);

    render(<ApicurioImportSource registryUrl={registryUrl} onSchemaLoaded={mockOnSchemaLoaded} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`${registryUrl}/apis/registry/v2/search/artifacts`);
    });

    await waitFor(() => {
      expect(screen.getByText('API Spec 1')).toBeInTheDocument();
    });

    expect(screen.getByText('API Spec 2')).toBeInTheDocument();
    expect(screen.queryByText('Schema')).not.toBeInTheDocument();
  });

  it('filters artifacts based on search term', async () => {
    const mockArtifacts = {
      artifacts: [
        { id: 'artifact-1', name: 'User API', type: 'OPENAPI' },
        { id: 'artifact-2', name: 'Product API', type: 'OPENAPI' },
      ],
    };

    fetchSpy.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockArtifacts),
    } as unknown as Response);

    render(<ApicurioImportSource registryUrl={registryUrl} onSchemaLoaded={mockOnSchemaLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('User API')).toBeInTheDocument();
      expect(screen.getByText('Product API')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search OpenAPI artifacts');
    fireEvent.change(searchInput, { target: { value: 'user' } });

    expect(screen.getByText('User API')).toBeInTheDocument();
    expect(screen.queryByText('Product API')).not.toBeInTheDocument();
  });

  it('loads artifact when selected', async () => {
    const mockArtifacts = {
      artifacts: [{ id: 'artifact-1', name: 'API Spec', type: 'OPENAPI' }],
    };

    const artifactContent = 'openapi: 3.0.0';

    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockArtifacts),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(artifactContent),
      } as unknown as Response);

    render(<ApicurioImportSource registryUrl={registryUrl} onSchemaLoaded={mockOnSchemaLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('API Spec')).toBeInTheDocument();
    });

    const radio = screen.getByLabelText(/API Spec/);
    fireEvent.click(radio);

    await waitFor(() => {
      expect(mockOnSchemaLoaded).toHaveBeenCalledWith({
        schema: artifactContent,
        source: 'apicurio',
        sourceIdentifier: `${registryUrl}/apis/registry/v2/groups/default/artifacts/artifact-1`,
      });
    });

    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });

  it('shows error when artifact fetch fails', async () => {
    const mockArtifacts = {
      artifacts: [{ id: 'artifact-1', name: 'API Spec', type: 'OPENAPI' }],
    };

    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockArtifacts),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as unknown as Response);

    render(<ApicurioImportSource registryUrl={registryUrl} onSchemaLoaded={mockOnSchemaLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('API Spec')).toBeInTheDocument();
    });

    const radio = screen.getByLabelText(/API Spec/);
    fireEvent.click(radio);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch artifact \(500\)/)).toBeInTheDocument();
    });
  });

  it('refreshes artifacts when refresh button is clicked', async () => {
    const mockArtifacts = {
      artifacts: [{ id: 'artifact-1', name: 'API Spec', type: 'OPENAPI' }],
    };

    fetchSpy.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockArtifacts),
    } as unknown as Response);

    render(<ApicurioImportSource registryUrl={registryUrl} onSchemaLoaded={mockOnSchemaLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('API Spec')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('shows "no artifacts" message when list is empty', async () => {
    const mockArtifacts = {
      artifacts: [],
    };

    fetchSpy.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockArtifacts),
    } as unknown as Response);

    render(<ApicurioImportSource registryUrl={registryUrl} onSchemaLoaded={mockOnSchemaLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('No OpenAPI artifacts found.')).toBeInTheDocument();
    });
  });

  it('shows error when initial artifact fetch fails', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    render(<ApicurioImportSource registryUrl={registryUrl} onSchemaLoaded={mockOnSchemaLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows generic error when initial fetch throws a non-Error value', async () => {
    fetchSpy.mockRejectedValue('non-error rejection');

    render(<ApicurioImportSource registryUrl={registryUrl} onSchemaLoaded={mockOnSchemaLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('Unable to fetch artifacts from Apicurio Registry.')).toBeInTheDocument();
    });
  });

  it('shows generic error when artifact load throws a non-Error value', async () => {
    const mockArtifacts = {
      artifacts: [{ id: 'artifact-1', name: 'API Spec', type: 'OPENAPI' }],
    };

    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockArtifacts),
      } as unknown as Response)
      .mockRejectedValueOnce('non-error rejection');

    render(<ApicurioImportSource registryUrl={registryUrl} onSchemaLoaded={mockOnSchemaLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('API Spec')).toBeInTheDocument();
    });

    const radio = screen.getByLabelText(/API Spec/);
    fireEvent.click(radio);

    await waitFor(() => {
      expect(screen.getByText('Unable to download the selected artifact.')).toBeInTheDocument();
    });
  });

  it('displays artifact id when name is missing', async () => {
    const mockArtifacts = {
      artifacts: [{ id: 'artifact-no-name', name: '', type: 'OPENAPI' }],
    };

    fetchSpy.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockArtifacts),
    } as unknown as Response);

    render(<ApicurioImportSource registryUrl={registryUrl} onSchemaLoaded={mockOnSchemaLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('artifact-no-name')).toBeInTheDocument();
    });
  });
});
