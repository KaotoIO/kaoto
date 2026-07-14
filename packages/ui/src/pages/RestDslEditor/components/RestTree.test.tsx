import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CamelResourceFactory } from '../../../models/camel/camel-resource-factory';
import { BaseVisualEntity } from '../../../models/visualization/base-visual-entity';
import { getRestEntities } from './get-rest-entities';
import { RestTree } from './RestTree';

describe('RestTree', () => {
  const mockOnSelect = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tree structure with RestConfiguration, Rest entities, and methods', async () => {
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
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

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

  it('should fire selection callback with correct entityId and modelPath when node clicked', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-method-1
        path: /test
        to:
          uri: direct:test
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

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

  it('should select a right-clicked node and open its delete menu', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-method-1
        path: /test
        to:
          uri: direct:test
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

    fireEvent.contextMenu(screen.getByText('/test'), { clientX: 120, clientY: 80 });

    expect(mockOnSelect).toHaveBeenCalledWith({
      entityId: 'rest-1234',
      modelPath: 'rest.get.0',
    });
    expect(await screen.findByRole('menu', { name: 'REST tree node actions' })).toBeInTheDocument();
    const deleteAction = screen.getByRole('menuitem', { name: /Delete/ });
    expect(deleteAction).toHaveClass('cds--menu-item');
    expect(deleteAction).toHaveClass('cds--menu-item--danger');
    expect(deleteAction.querySelector('svg')).toBeInTheDocument();
  });

  it('should move the open menu when another node is right-clicked', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1
- rest:
    id: rest-2
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

    fireEvent.contextMenu(screen.getByText('rest-1'), { clientX: 20, clientY: 30 });
    await waitFor(() => {
      expect(screen.getByRole('menu', { name: 'REST tree node actions' })).toHaveStyle({
        insetInlineStart: '20px',
        insetBlockStart: '30px',
      });
    });

    fireEvent.contextMenu(screen.getByText('rest-2'), { clientX: 220, clientY: 230 });

    await waitFor(() => {
      expect(screen.getAllByRole('menu', { name: 'REST tree node actions' })).toHaveLength(1);
      expect(screen.getByRole('menu', { name: 'REST tree node actions' })).toHaveStyle({
        insetInlineStart: '220px',
        insetBlockStart: '230px',
      });
    });
    expect(mockOnSelect).toHaveBeenLastCalledWith({ entityId: 'rest-2', modelPath: 'rest' });
  });

  it('should open the same menu for configuration, service, and method badge targets', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- restConfiguration:
    host: localhost
- rest:
    id: rest-1
    get:
      - id: get-1
        path: /users
        to:
          uri: direct:getUsers
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    const configuration = entities.find((entity) => entity.getRootPath() === 'restConfiguration');
    if (!configuration) fail('REST configuration not found');

    render(<RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

    fireEvent.contextMenu(screen.getByText(configuration.id));
    expect(mockOnSelect).toHaveBeenLastCalledWith({
      entityId: configuration.id,
      modelPath: 'restConfiguration',
    });

    fireEvent.contextMenu(screen.getByText('rest-1'));
    expect(mockOnSelect).toHaveBeenLastCalledWith({ entityId: 'rest-1', modelPath: 'rest' });

    fireEvent.contextMenu(screen.getByText('GET'));
    expect(mockOnSelect).toHaveBeenLastCalledWith({ entityId: 'rest-1', modelPath: 'rest.get.0' });
    expect(screen.getAllByRole('menu', { name: 'REST tree node actions' })).toHaveLength(1);
  });

  it('should not select an already selected node again', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    render(
      <RestTree
        entities={entities}
        selected={{ entityId: 'rest-1', modelPath: 'rest' }}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />,
    );

    fireEvent.contextMenu(screen.getByText('rest-1'));

    expect(await screen.findByRole('menu', { name: 'REST tree node actions' })).toBeInTheDocument();
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('should delete through the context menu and close it', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

    fireEvent.contextMenu(screen.getByText('rest-1'));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));

    expect(mockOnDelete).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: 'REST tree node actions' })).not.toBeInTheDocument();
    });
  });

  it('should close the context menu with Escape or an outside click', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

    const treeItem = screen.getByText('rest-1').closest('[role="treeitem"]');
    if (!(treeItem instanceof HTMLElement)) fail('REST tree item not found');

    fireEvent.contextMenu(treeItem);
    const deleteAction = await screen.findByRole('menuitem', { name: /Delete/ });
    await waitFor(() => {
      expect(deleteAction).toHaveFocus();
    });
    fireEvent.keyDown(deleteAction, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: 'REST tree node actions' })).not.toBeInTheDocument();
    });
    expect(treeItem).toHaveFocus();

    fireEvent.contextMenu(screen.getByText('rest-1'));
    expect(await screen.findByRole('menu', { name: 'REST tree node actions' })).toBeInTheDocument();
    fireEvent.pointerDown(globalThis.document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: 'REST tree node actions' })).not.toBeInTheDocument();
    });
  });

  it('should handle empty entities array gracefully', async () => {
    const entities: BaseVisualEntity[] = [];

    render(<RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

    expect(screen.getByRole('tree', { name: 'Rest DSL Configuration' })).toBeInTheDocument();

    expect(screen.queryAllByRole('treeitem')).toHaveLength(0);

    fireEvent.contextMenu(screen.getByRole('tree', { name: 'Rest DSL Configuration' }));
    expect(screen.queryByRole('menu', { name: 'REST tree node actions' })).not.toBeInTheDocument();
  });

  it('should render children prop (toolbar area)', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());

    render(
      <RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete}>
        <div>Toolbar Content</div>
      </RestTree>,
    );

    expect(screen.getByText('Toolbar Content')).toBeInTheDocument();
  });

  it('should highlight selected Rest entity node', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        path: /test
        to:
          uri: direct:test
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    const selected = { entityId: 'rest-1234', modelPath: 'rest' };

    const { container } = render(
      <RestTree entities={entities} selected={selected} onSelect={mockOnSelect} onDelete={mockOnDelete} />,
    );

    expect(screen.getByRole('tree', { name: 'Rest DSL Configuration' })).toBeInTheDocument();

    // The active node ID should be constructed as entityId::modelPath
    // Carbon TreeView uses this to highlight the selected node
    const expectedActiveId = 'rest-1234::rest';

    const activeNode = container.querySelector(`[id="${expectedActiveId}"]`);
    expect(activeNode).toBeInTheDocument();
  });

  it('should highlight selected method node', async () => {
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
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    const selected = { entityId: 'rest-1234', modelPath: 'rest.post.0' };

    const { container } = render(
      <RestTree entities={entities} selected={selected} onSelect={mockOnSelect} onDelete={mockOnDelete} />,
    );

    const expectedActiveId = 'rest-1234::rest.post.0';

    const activeNode = container.querySelector(`[id="${expectedActiveId}"]`);
    expect(activeNode).toBeInTheDocument();
  });

  it('should handle undefined selected prop', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());

    render(<RestTree entities={entities} selected={undefined} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

    expect(screen.getByRole('tree', { name: 'Rest DSL Configuration' })).toBeInTheDocument();
    expect(screen.getByText('rest-1234')).toBeInTheDocument();
  });

  it('should update selection when selected prop changes', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        path: /test
        to:
          uri: direct:test
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    const initialSelected = { entityId: 'rest-1234', modelPath: 'rest' };

    const { container, rerender } = render(
      <RestTree entities={entities} selected={initialSelected} onSelect={mockOnSelect} onDelete={mockOnDelete} />,
    );

    let expectedActiveId = 'rest-1234::rest';
    let activeNode = container.querySelector(`[id="${expectedActiveId}"]`);
    expect(activeNode).toBeInTheDocument();

    const newSelected = { entityId: 'rest-1234', modelPath: 'rest.get.0' };
    rerender(<RestTree entities={entities} selected={newSelected} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

    expectedActiveId = 'rest-1234::rest.get.0';
    activeNode = container.querySelector(`[id="${expectedActiveId}"]`);
    expect(activeNode).toBeInTheDocument();
  });

  it('should display "not specified" when method path is undefined', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        to:
          uri: direct:test
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

    expect(screen.getByText('not specified')).toBeInTheDocument();
  });

  it('should display "not specified" when method path is empty', async () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        path: "                  "
        to:
          uri: direct:test
    `);
    await camelResource.initialize();

    const entities = getRestEntities(camelResource.getEntities());
    render(<RestTree entities={entities} onSelect={mockOnSelect} onDelete={mockOnDelete} />);

    expect(screen.getByText('not specified')).toBeInTheDocument();
  });
});
