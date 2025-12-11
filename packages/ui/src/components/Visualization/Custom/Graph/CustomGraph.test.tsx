import { GraphContextMenuFn } from './CustomGraph';

describe('GraphContextMenuFn', () => {
  it('GraphContextMenuFn always renders ShowOrHideAllFlows items', () => {
    const entityContextMenuFn = jest.fn().mockReturnValue([]);
    const items = GraphContextMenuFn(entityContextMenuFn);

    expect(
      items.some(
        (item) =>
          item.props['data-testid'] === 'context-menu-item-show-all' &&
          item.props.children[1].props.children === 'Show all',
      ),
    ).toBe(true);

    expect(
      items.some(
        (item) =>
          item.props['data-testid'] === 'context-menu-item-hide-all' &&
          item.props.children[1].props.children === 'Hide all',
      ),
    ).toBe(true);
  });

  it('renders ContextSubMenuItem if entities exist', () => {
    const entity = (
      <div key="entity-1" data-testid="entity-item">
        Entity 1
      </div>
    );
    const entityContextMenuFn = jest.fn().mockReturnValue([entity]);
    const items = GraphContextMenuFn(entityContextMenuFn);

    // Should contain a ContextSubMenuItem with the entity inside
    const subMenuItem = items.find((item) => item.props['data-testid'] === 'context-menu-item-new-entity');
    expect(subMenuItem).toBeDefined();
    expect(subMenuItem!.props.children).toContainEqual(entity);
  });

  it('does not render ContextSubMenuItem if no entities', () => {
    const entityContextMenuFn = jest.fn().mockReturnValue([]);
    const items = GraphContextMenuFn(entityContextMenuFn);

    expect(items.some((item) => item.props['data-testid'] === 'context-menu-item-new-entity')).toBe(false);
  });
});
