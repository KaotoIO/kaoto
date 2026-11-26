import { Code } from '@carbon/icons-react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EditorTab } from './EditorTab';

describe('EditorTab', () => {
  it.each([
    ['orders.camel.yaml', 'orders.camel.yaml'],
    ['integrations/routes/orders.camel.yaml', 'orders.camel.yaml'],
    ['resources/Order Mapping.XSL', 'Order Mapping.XSL'],
  ])('shows the file %s as the selected tab %s', (path, name) => {
    render(<EditorTab icon={Code} path={path} onClose={vi.fn()} />);

    expect(screen.getByRole('tab', { name, selected: true })).toBeInTheDocument();
  });

  it('describes the tab with the full path of the file', () => {
    render(<EditorTab icon={Code} path="integrations/routes/orders.camel.yaml" onClose={vi.fn()} />);

    expect(screen.getByRole('tab')).toHaveAccessibleDescription('integrations/routes/orders.camel.yaml');
  });

  it('reports a click on its close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EditorTab icon={Code} path="integrations/orders.camel.yaml" onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close orders.camel.yaml' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
