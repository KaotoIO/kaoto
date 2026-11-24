import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CopyFileButton } from './CopyFileButton';

const CONTENT = '- route:\n    id: orders\n';

describe('CopyFileButton', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('copies the content to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    render(<CopyFileButton content={CONTENT} />);

    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }));

    expect(writeText).toHaveBeenCalledWith(CONTENT);
  });

  it('confirms the copy in its label for two seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CopyFileButton content={CONTENT} />);

    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    expect(screen.getByRole('button', { name: 'Copied to clipboard' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument();
  });

  it('tells in its label that the content could not be copied', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Not allowed'));
    render(<CopyFileButton content={CONTENT} />);

    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }));

    expect(await screen.findByRole('button', { name: 'Could not copy to clipboard' })).toBeInTheDocument();
  });
});
