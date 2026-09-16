import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { startKaotoWebview } from './webview-entry';

describe('startKaotoWebview', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="kaoto-editor"></div>';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows the error and a Retry button when the transport cannot be created', async () => {
    const createTransport = vi.fn(() => {
      throw new Error('No Kaoto host');
    });

    startKaotoWebview(createTransport);

    expect(await screen.findByRole('alert')).toHaveTextContent('No Kaoto host');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it('asks the host for a fresh transport when Retry is clicked', async () => {
    const createTransport = vi.fn(() => {
      throw new Error('No Kaoto host');
    });
    startKaotoWebview(createTransport);

    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(createTransport).toHaveBeenCalledTimes(2);
    });
  });
});
