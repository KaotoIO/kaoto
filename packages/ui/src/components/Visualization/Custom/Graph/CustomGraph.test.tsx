import { render, screen } from '@testing-library/react';

import { GraphContextMenuFn } from './CustomGraph';

describe('GraphContextMenuFn', () => {
  it('always renders Show all and Hide all menu items', () => {
    const entityContextMenuFn = jest.fn().mockReturnValue([]);
    const items = GraphContextMenuFn(entityContextMenuFn);

    render(<>{items}</>);

    expect(screen.getByTestId('context-menu-item-show-all')).toBeInTheDocument();
    expect(screen.getByText('Show all')).toBeInTheDocument();

    expect(screen.getByTestId('context-menu-item-hide-all')).toBeInTheDocument();
    expect(screen.getByText('Hide all')).toBeInTheDocument();
  });

  it('returns correct structure when no entities exist', () => {
    const entityContextMenuFn = jest.fn().mockReturnValue([]);
    const items = GraphContextMenuFn(entityContextMenuFn);

    // Should only have Show all and Hide all items
    expect(items).toHaveLength(2);
    expect(items[0].key).toBe('showAll');
    expect(items[1].key).toBe('hideAll');
  });

  it('includes New submenu when entities exist', () => {
    const entities = [<div key="entity-1">Entity 1</div>];
    const entityContextMenuFn = jest.fn().mockReturnValue(entities);
    const items = GraphContextMenuFn(entityContextMenuFn);

    // Should have: Show all, Hide all, Divider, New submenu
    expect(items).toHaveLength(4);
    expect(items[0].key).toBe('showAll');
    expect(items[1].key).toBe('hideAll');
    expect(items[2].key).toBe('new-entity-divider');
    expect(items[3].key).toBe('new-entity');

    render(<>{items}</>);

    // Verify the New submenu is rendered
    expect(screen.getByTestId('context-menu-item-new-entity')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('calls entityContextMenuFn to get entities', () => {
    const entityContextMenuFn = jest.fn().mockReturnValue([]);
    GraphContextMenuFn(entityContextMenuFn);

    expect(entityContextMenuFn).toHaveBeenCalledTimes(1);
  });
});
