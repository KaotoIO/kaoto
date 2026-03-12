import { fireEvent, render, screen } from '@testing-library/react';

import { CamelResourceFactory } from '../../../models/camel/camel-resource-factory';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
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

    const entities = camelResource.getVisualEntities();
    const { container } = render(<RestTree entities={entities} onSelect={mockOnSelect} />);

    // Verify tree label
    expect(screen.getByText('Rest DSL Configuration')).toBeInTheDocument();

    // Verify RestConfiguration node (displays ID, not label)
    expect(screen.getByText(/restConfiguration-/)).toBeInTheDocument();

    // Verify both Rest entities are displayed (by their IDs)
    expect(screen.getByText('rest-1')).toBeInTheDocument();
    expect(screen.getByText('rest-2')).toBeInTheDocument();

    // Verify parent nodes have tree structure
    const treeNodes = container.querySelectorAll('.cds--tree-node');
    expect(treeNodes.length).toBeGreaterThan(0);

    // Verify method IDs are displayed (child nodes visible = expanded by default)
    expect(screen.getByText('/users')).toBeInTheDocument();
    expect(screen.getByText('/orders')).toBeInTheDocument();
    expect(screen.getByText('/items/{id}')).toBeInTheDocument();

    // Verify methods are rendered as tags (Carbon Tag component)
    const tags = container.querySelectorAll('.cds--tag');
    expect(tags.length).toBeGreaterThan(0);
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

    const entities = camelResource.getVisualEntities();
    render(<RestTree entities={entities} onSelect={mockOnSelect} />);

    // Click on the Rest parent node (by its ID)
    const restNode = screen.getByText('rest-1234');
    fireEvent.click(restNode);

    expect(mockOnSelect).toHaveBeenCalledWith({
      entityId: 'rest-1234',
      modelPath: 'rest',
    });

    // Clear mock
    mockOnSelect.mockClear();

    // Click on a method node (by its ID)
    const methodNode = screen.getByText('/test');
    fireEvent.click(methodNode);

    expect(mockOnSelect).toHaveBeenCalledWith({
      entityId: 'rest-1234',
      modelPath: 'rest.get.0',
    });
  });

  it('should handle empty entities array gracefully', () => {
    const entities: BaseVisualCamelEntity[] = [];

    const { container } = render(<RestTree entities={entities} onSelect={mockOnSelect} />);

    // Tree should still render with label
    expect(screen.getByText('Rest DSL Configuration')).toBeInTheDocument();

    // No tree nodes should be present
    const treeNodes = container.querySelectorAll('.cds--tree-node');
    expect(treeNodes.length).toBe(0);
  });

  it('should render children prop (toolbar area)', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    `);

    const entities = camelResource.getVisualEntities();

    render(
      <RestTree entities={entities} onSelect={mockOnSelect}>
        <div data-testid="toolbar-content">Toolbar Content</div>
      </RestTree>,
    );

    // Verify children are rendered
    expect(screen.getByTestId('toolbar-content')).toBeInTheDocument();
    expect(screen.getByText('Toolbar Content')).toBeInTheDocument();
  });
});
