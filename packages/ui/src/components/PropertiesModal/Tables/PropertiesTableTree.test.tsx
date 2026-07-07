import { fireEvent, render, screen } from '@testing-library/react';

import { IPropertiesTable, PropertiesHeaders, PropertiesTableType } from '../PropertiesModal.models';
import { PropertiesTableTree } from './PropertiesTableTree';

describe('PropertiesTableTree', () => {
  const table: IPropertiesTable = {
    type: PropertiesTableType.Tree,
    headers: [PropertiesHeaders.Name, PropertiesHeaders.Description],
    rows: [
      {
        name: 'parent',
        description: 'parent description',
        type: 'object',
        rowAdditionalInfo: {},
        children: [{ name: 'child', description: 'child description', type: 'string', rowAdditionalInfo: {} }],
      },
      { name: 'sibling', description: 'sibling description', type: 'string', rowAdditionalInfo: {} },
    ],
  };

  const renderTree = () => render(<PropertiesTableTree rootDataTestId="props" table={table} />);

  it('renders every row of the tree, including nested children', () => {
    renderTree();

    expect(screen.getByText('parent')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
    expect(screen.getByText('sibling')).toBeInTheDocument();
  });

  it('toggles the expanded state of a parent row when its toggle is clicked', () => {
    renderTree();

    // Only the parent row (the one with children) exposes an expand/collapse toggle.
    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
