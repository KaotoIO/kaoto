import { Code } from '@carbon/icons-react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EditorHeader } from './EditorHeader';

describe('EditorHeader', () => {
  it.each([
    ['orders.camel.yaml', 'orders.camel.yaml'],
    ['integrations/routes/orders.camel.yaml', 'orders.camel.yaml'],
    ['resources/Order Mapping.XSL', 'Order Mapping.XSL'],
  ])('shows the file %s by its name %s', (path, name) => {
    render(<EditorHeader icon={Code} path={path} content="" />);

    expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
  });

  it.each(['Undo', 'Redo'])('shows %s, disabled while there is nothing to undo', (name) => {
    render(<EditorHeader icon={Code} path="orders.camel.yaml" content="" />);

    expect(screen.getByRole('button', { name })).toBeDisabled();
  });
});
