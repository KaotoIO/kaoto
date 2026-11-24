import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DocumentationButton } from './DocumentationButton';

describe('DocumentationButton', () => {
  it('opens the route documentation when it is clicked', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<DocumentationButton onOpen={onOpen} />);

    await user.click(screen.getByRole('button', { name: 'Generate route documentation' }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('is disabled when there is no route documentation to open', () => {
    render(<DocumentationButton disabled onOpen={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Generate route documentation' })).toBeDisabled();
  });
});
