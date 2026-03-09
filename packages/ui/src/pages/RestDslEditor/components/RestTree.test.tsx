import { fireEvent, render, screen } from '@testing-library/react';

import { CamelResourceFactory } from '../../../models/camel/camel-resource-factory';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { getRestEntities } from './get-rest-entities';
import { RestTree } from './RestTree';

describe('RestTree', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tree structure with RestConfiguration, Rest entities, and methods', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- restConfiguration:
    host: localhost
    port: "8080"
- rest:
    id: rest-1
    get:
      - id: get-1
        path: /users
        to:
          uri: direct:getUsers
    post:
      - id: post-1
        path: /orders
        to:
          uri: direct:createOrder
- rest:
    id: rest-2
    delete:
      - id: delete-1
        path: /items/{id}
        to:
          uri: direct:deleteItem
    `);

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} />);

    expect(screen.getByRole('tree', { name: 'Rest DSL Configuration' })).toBeInTheDocument();

    expect(screen.getByText(/restConfiguration-/)).toBeInTheDocument();

    expect(screen.getByText('rest-1')).toBeInTheDocument();
    expect(screen.getByText('rest-2')).toBeInTheDocument();

    const treeItems = screen.getAllByRole('treeitem');
    expect(treeItems.length).toBeGreaterThan(0);

    expect(screen.getByText('/users')).toBeInTheDocument();
    expect(screen.getByText('/orders')).toBeInTheDocument();
    expect(screen.getByText('/items/{id}')).toBeInTheDocument();
  });

  it('should fire selection callback with correct entityId and modelPath when node clicked', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-method-1
        path: /test
        to:
          uri: direct:test
    `);

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} />);

    const restNode = screen.getByText('rest-1234');
    fireEvent.click(restNode);

    expect(mockOnSelect).toHaveBeenCalledWith({
      entityId: 'rest-1234',
      modelPath: 'rest',
    });

    mockOnSelect.mockClear();

    const methodNode = screen.getByText('/test');
    fireEvent.click(methodNode);

    expect(mockOnSelect).toHaveBeenCalledWith({
      entityId: 'rest-1234',
      modelPath: 'rest.get.0',
    });
  });

  it('should handle empty entities array gracefully', () => {
    const entities: BaseVisualCamelEntity[] = [];

    render(<RestTree entities={entities} onSelect={mockOnSelect} />);

    expect(screen.getByRole('tree', { name: 'Rest DSL Configuration' })).toBeInTheDocument();

    expect(screen.queryAllByRole('treeitem')).toHaveLength(0);
  });

  it('should render children prop (toolbar area)', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    `);

    const entities = getRestEntities(camelResource.getEntities());

    render(
      <RestTree entities={entities} onSelect={mockOnSelect}>
        <div>Toolbar Content</div>
      </RestTree>,
    );

    expect(screen.getByText('Toolbar Content')).toBeInTheDocument();
  });

  it('should highlight selected Rest entity node', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        path: /test
        to:
          uri: direct:test
    `);

    const entities = getRestEntities(camelResource.getEntities());
    const selected = { entityId: 'rest-1234', modelPath: 'rest' };

    const { container } = render(<RestTree entities={entities} selected={selected} onSelect={mockOnSelect} />);

    expect(screen.getByRole('tree', { name: 'Rest DSL Configuration' })).toBeInTheDocument();

    // The active node ID should be constructed as entityId::modelPath
    // Carbon TreeView uses this to highlight the selected node
    const expectedActiveId = 'rest-1234::rest';

    const activeNode = container.querySelector(`[id="${expectedActiveId}"]`);
    expect(activeNode).toBeInTheDocument();
  });

  it('should highlight selected method node', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        path: /test
        to:
          uri: direct:test
    post:
      - id: post-1
        path: /orders
        to:
          uri: direct:orders
    `);

    const entities = getRestEntities(camelResource.getEntities());
    const selected = { entityId: 'rest-1234', modelPath: 'rest.post.0' };

    const { container } = render(<RestTree entities={entities} selected={selected} onSelect={mockOnSelect} />);

    const expectedActiveId = 'rest-1234::rest.post.0';

    const activeNode = container.querySelector(`[id="${expectedActiveId}"]`);
    expect(activeNode).toBeInTheDocument();
  });

  it('should handle undefined selected prop', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    `);

    const entities = getRestEntities(camelResource.getEntities());

    render(<RestTree entities={entities} selected={undefined} onSelect={mockOnSelect} />);

    expect(screen.getByRole('tree', { name: 'Rest DSL Configuration' })).toBeInTheDocument();
    expect(screen.getByText('rest-1234')).toBeInTheDocument();
  });

  it('should update selection when selected prop changes', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        path: /test
        to:
          uri: direct:test
    `);

    const entities = getRestEntities(camelResource.getEntities());
    const initialSelected = { entityId: 'rest-1234', modelPath: 'rest' };

    const { container, rerender } = render(
      <RestTree entities={entities} selected={initialSelected} onSelect={mockOnSelect} />,
    );

    let expectedActiveId = 'rest-1234::rest';
    let activeNode = container.querySelector(`[id="${expectedActiveId}"]`);
    expect(activeNode).toBeInTheDocument();

    const newSelected = { entityId: 'rest-1234', modelPath: 'rest.get.0' };
    rerender(<RestTree entities={entities} selected={newSelected} onSelect={mockOnSelect} />);

    expectedActiveId = 'rest-1234::rest.get.0';
    activeNode = container.querySelector(`[id="${expectedActiveId}"]`);
    expect(activeNode).toBeInTheDocument();
  });

  it('should display "not specified" when method path is undefined', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        to:
          uri: direct:test
    `);

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} />);

    expect(screen.getByText('not specified')).toBeInTheDocument();
  });

  it('should display "not specified" when method path is empty', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        path: "                  "
        to:
          uri: direct:test
    `);

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} />);

    expect(screen.getByText('not specified')).toBeInTheDocument();
  });
});
