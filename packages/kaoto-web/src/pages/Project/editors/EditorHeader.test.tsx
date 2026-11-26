import { Code } from '@carbon/icons-react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorHeader } from './EditorHeader';

describe('EditorHeader', () => {
  it('shows the open file as the only tab in the list of open files', () => {
    render(<EditorHeader icon={Code} path="integrations/orders.camel.yaml" content="" onClose={vi.fn()} />);

    const tabs = within(screen.getByRole('tablist', { name: 'Open files' })).getAllByRole('tab');

    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toHaveAccessibleName('orders.camel.yaml');
  });

  it.each(['Undo', 'Redo'])('shows %s, disabled while there is nothing to undo', (name) => {
    render(<EditorHeader icon={Code} path="orders.camel.yaml" content="" onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name })).toBeDisabled();
  });
});
