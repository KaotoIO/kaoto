import { fireEvent, render, within } from '@testing-library/react';

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

  it('renders menu items for commonEntities', () => {
    const items = generateEntityContextMenu({
      commonEntities,
      groupedEntities: {},
      createEntity,
    });

    const { getByTestId } = render(<>{items}</>);

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

    const { getByTestId } = render(<>{items}</>);

    commonEntities.forEach((entity) => {
      const item = getByTestId(`new-entity-${entity.name}`);
      fireEvent.click(within(item).getByRole('menuitem'));
      expect(createEntity).toHaveBeenCalledWith(entity.name);
    });
  });

  it('renders groupedEntities as submenus with correct items', async () => {
    const items = generateEntityContextMenu({
      commonEntities: [],
      groupedEntities,
      createEntity,
    });

    const { getByText, findByTestId } = render(<>{items}</>);

    for (const [groupName, entities] of Object.entries(groupedEntities)) {
      expect(getByText(groupName)).toBeInTheDocument();
      /* The submenu items are rendered once the submenu is hovered */
      fireEvent.mouseEnter(getByText(groupName));
      for (const entity of entities) {
        const item = await findByTestId(`new-entity-${entity.name}`);
        expect(item).toBeInTheDocument();
        expect(item).toHaveTextContent(entity.title);
      }
    }
  });

  it('calls createEntity when groupedEntities menu item is mouse downed', async () => {
    const items = generateEntityContextMenu({
      commonEntities: [],
      groupedEntities,
      createEntity,
    });

    const { getByText, findByTestId } = render(<>{items}</>);

    for (const [groupName, entities] of Object.entries(groupedEntities)) {
      /* The submenu items are rendered once the submenu is hovered */
      fireEvent.mouseEnter(getByText(groupName));
      for (const entity of entities) {
        const item = await findByTestId(`new-entity-${entity.name}`);
        fireEvent.mouseDown(within(item).getByRole('menuitem'));
        expect(createEntity).toHaveBeenCalledWith(entity.name);
      }
    }
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
