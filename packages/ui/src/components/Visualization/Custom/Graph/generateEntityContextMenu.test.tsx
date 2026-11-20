import { Menu, MenuContent, MenuList } from '@patternfly/react-core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement } from 'react';

import { EntityType } from '../../../../models/entities';
import { generateEntityContextMenu } from './generateEntityContextMenu';

describe('generateEntityContextMenu', () => {
  const createEntity = vi.fn();

  const commonEntities = [
    {
      name: 'entity1' as EntityType,
      title: 'Entity 1',
      description: 'Description 1',
    },
    {
      name: 'entity2' as EntityType,
      title: 'Entity 2',
      description: 'Description 2',
    },
  ];

  const groupedEntities = {
    GroupA: [
      {
        name: 'groupEntity1' as EntityType,
        title: 'Group Entity 1',
        description: 'Group Description 1',
      },
    ],
    GroupB: [
      {
        name: 'groupEntity2' as EntityType,
        title: 'Group Entity 2',
        description: 'Group Description 2',
      },
      {
        name: 'groupEntity3' as EntityType,
        title: 'Group Entity 3',
        description: 'Group Description 3',
      },
    ],
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  /** The items are rendered in a menu, like the canvas context menu does */
  const renderInMenu = (items: ReactElement[]) =>
    render(
      <Menu>
        <MenuContent>
          <MenuList>{items}</MenuList>
        </MenuContent>
      </Menu>,
    );

  it('renders menu items for commonEntities', () => {
    const items = generateEntityContextMenu({
      commonEntities,
      groupedEntities: {},
      createEntity,
    });

    const { getByTestId } = renderInMenu(items);

    commonEntities.forEach((entity) => {
      const item = getByTestId(`new-entity-${entity.name}`);
      expect(item).toBeInTheDocument();
      expect(item).toHaveTextContent(entity.title);
    });
  });

  it('calls createEntity when commonEntities menu item is clicked', () => {
    const items = generateEntityContextMenu({
      commonEntities,
      groupedEntities: {},
      createEntity,
    });

    const { getByTestId } = renderInMenu(items);

    commonEntities.forEach((entity) => {
      const item = getByTestId(`new-entity-${entity.name}`);
      fireEvent.click(within(item).getByRole('menuitem'));
      expect(createEntity).toHaveBeenCalledWith(entity.name);
    });
  });

  it('renders groupedEntities as submenus with correct items', async () => {
    const user = userEvent.setup();
    const items = generateEntityContextMenu({
      commonEntities: [],
      groupedEntities,
      createEntity,
    });

    renderInMenu(items);

    for (const [groupName, entities] of Object.entries(groupedEntities)) {
      const group = screen.getByRole('menuitem', { name: groupName });
      expect(group).toHaveAttribute('aria-haspopup', 'menu');
      /* The submenu items are rendered once the submenu is hovered */
      await user.hover(group);
      const subMenu = screen.getByRole('menu', { name: groupName });
      for (const entity of entities) {
        const item = within(subMenu).getByTestId(`new-entity-${entity.name}`);
        expect(item).toHaveTextContent(entity.title);
      }
    }
  });

  it('calls createEntity when a groupedEntities menu item is clicked', async () => {
    const user = userEvent.setup();
    const items = generateEntityContextMenu({
      commonEntities: [],
      groupedEntities,
      createEntity,
    });

    renderInMenu(items);

    for (const [groupName, entities] of Object.entries(groupedEntities)) {
      for (const entity of entities) {
        await user.hover(screen.getByRole('menuitem', { name: groupName }));
        await user.click(within(screen.getByTestId(`new-entity-${entity.name}`)).getByRole('menuitem'));
        expect(createEntity).toHaveBeenCalledWith(entity.name);
      }
    }
  });

  it('keeps a submenu open while the pointer moves onto it and closes it when the pointer moves on', async () => {
    const user = userEvent.setup();
    const items = generateEntityContextMenu({
      commonEntities: [],
      groupedEntities,
      createEntity,
    });

    renderInMenu(items);
    const groupA = screen.getByRole('menuitem', { name: 'GroupA' });
    await user.hover(groupA);
    const subMenuItem = within(screen.getByRole('menu', { name: 'GroupA' })).getByRole('menuitem');

    // user-event moves the pointer without a related target, as if it left the window
    fireEvent.mouseLeave(groupA, { relatedTarget: subMenuItem });
    expect(groupA).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseLeave(subMenuItem, { relatedTarget: screen.getByRole('menuitem', { name: 'GroupB' }) });
    expect(groupA).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu', { name: 'GroupA' })).not.toBeInTheDocument();
  });

  it('calls createEntity when a groupedEntities menu item is chosen with the keyboard', async () => {
    const user = userEvent.setup();
    const items = generateEntityContextMenu({
      commonEntities: [],
      groupedEntities,
      createEntity,
    });

    renderInMenu(items);
    await user.tab();
    expect(screen.getByRole('menuitem', { name: 'GroupA' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'GroupB' })).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowDown}{Enter}');

    expect(createEntity).toHaveBeenCalledWith('groupEntity3');
  });

  it('returns empty array if no entities are provided', () => {
    const items = generateEntityContextMenu({
      commonEntities: [],
      groupedEntities: {},
      createEntity,
    });
    expect(items).toEqual([]);
  });
});
