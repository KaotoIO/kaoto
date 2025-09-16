import { fireEvent, render } from '@testing-library/react';
import { EntityType } from '../../../../models/camel/entities';
import { generateEntityContextMenu } from './generateEntityContextMenu';

jest.mock('@patternfly/react-topology', () => ({
  ContextMenuItem: jest.fn(({ children, ...props }) => <div {...props}>{children}</div>),
  ContextSubMenuItem: jest.fn(({ label, children, ...props }) => (
    <div {...props}>
      <span>{label}</span>
      {children}
    </div>
  )),
}));

describe('generateEntityContextMenu', () => {
  const createEntity = jest.fn();

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
    jest.clearAllMocks();
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
      fireEvent.click(item);
      expect(createEntity).toHaveBeenCalledWith(entity.name);
    });
  });

  it('renders groupedEntities as submenus with correct items', () => {
    const items = generateEntityContextMenu({
      commonEntities: [],
      groupedEntities,
      createEntity,
    });

    const { getByText, getByTestId } = render(<>{items}</>);

    Object.entries(groupedEntities).forEach(([groupName, entities]) => {
      expect(getByText(groupName)).toBeInTheDocument();
      entities.forEach((entity) => {
        const item = getByTestId(`new-entity-${entity.name}`);
        expect(item).toBeInTheDocument();
        expect(item).toHaveTextContent(entity.title);
      });
    });
  });

  it('calls createEntity when groupedEntities menu item is mouse downed', () => {
    const items = generateEntityContextMenu({
      commonEntities: [],
      groupedEntities,
      createEntity,
    });

    const { getByTestId } = render(<>{items}</>);

    Object.values(groupedEntities)
      .flat()
      .forEach((entity) => {
        const item = getByTestId(`new-entity-${entity.name}`);
        fireEvent.mouseDown(item);
        expect(createEntity).toHaveBeenCalledWith(entity.name);
      });
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
