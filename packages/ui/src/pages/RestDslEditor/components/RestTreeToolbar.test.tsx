import { SuggestionRegistryProvider } from '@kaoto/forms';
import { fireEvent, render, screen } from '@testing-library/react';

import { CamelResourceFactory } from '../../../models/camel/camel-resource-factory';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { CamelRestConfigurationVisualEntity } from '../../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { clickToolbarActionUtil } from '../test-utils';
import { getRestEntities } from './get-rest-entities';
import { RestTreeToolbar } from './RestTreeToolbar';

// Wrapper component to provide required context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SuggestionRegistryProvider>{children}</SuggestionRegistryProvider>
);

describe('RestTreeToolbar', () => {
  const mockOnAddRestConfiguration = jest.fn();
  const mockOnAddRest = jest.fn();
  const mockOnAddMethod = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Add RestConfiguration button', () => {
    it('should be disabled when RestConfiguration already exists', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- restConfiguration:
    host: localhost
    port: "8080"
- rest:
    id: rest-1234
      `);

      const entities = getRestEntities(camelResource.getEntities());

      render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const addRestConfigButton = screen.getByText('Add Configuration').closest('li');
      expect(addRestConfigButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should be enabled when no RestConfiguration exists', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = getRestEntities(camelResource.getEntities());

      render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const addRestConfigButton = screen.getByText('Add Configuration').closest('li');
      expect(addRestConfigButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should fire callback when clicked', async () => {
      const entities: BaseVisualCamelEntity[] = [];

      render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      await clickToolbarActionUtil('Add Configuration');
      expect(mockOnAddRestConfiguration).toHaveBeenCalledTimes(1);
    });
  });

  describe('Add Rest button', () => {
    it('should always be enabled', () => {
      const entities: BaseVisualCamelEntity[] = [];

      render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const addRestButton = screen.getByText('Add Service').closest('li');
      expect(addRestButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should be enabled even with entities present', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
- restConfiguration:
    host: localhost
      `);

      const entities = getRestEntities(camelResource.getEntities());

      render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const addRestButton = screen.getByText('Add Service').closest('li');
      expect(addRestButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should fire callback when clicked', async () => {
      const entities: BaseVisualCamelEntity[] = [];

      render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      await clickToolbarActionUtil('Add Service');
      expect(mockOnAddRest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Add Method button', () => {
    it('should be disabled when nothing is selected', () => {
      const entities: BaseVisualCamelEntity[] = [];

      render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const addMethodButton = screen.getByText('Add Operation').closest('li');
      expect(addMethodButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should be disabled when RestConfiguration is selected', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- restConfiguration:
    host: localhost
    port: "8080"
      `);

      const entities = getRestEntities(camelResource.getEntities());
      const restConfigEntity = entities[0] as CamelRestConfigurationVisualEntity;

      render(
        <RestTreeToolbar
          entities={entities}
          selectedElement={{ entityId: restConfigEntity.id, modelPath: 'restConfiguration' }}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const addMethodButton = screen.getByText('Add Operation').closest('li');
      expect(addMethodButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should be enabled when Rest entity root is selected', () => {
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

      render(
        <RestTreeToolbar
          entities={entities}
          selectedElement={{ entityId: 'rest-1234', modelPath: 'rest' }}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const addMethodButton = screen.getByText('Add Operation').closest('li');
      expect(addMethodButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should be enabled when a Rest method is selected', () => {
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

      render(
        <RestTreeToolbar
          entities={entities}
          selectedElement={{ entityId: 'rest-1234', modelPath: 'rest.get.0' }}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const addMethodButton = screen.getByText('Add Operation').closest('li');
      expect(addMethodButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should be disabled when a non-Rest path is selected', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        path: /test
        to:
          uri: direct:test
- route:
    id: route-1234
    from:
      uri: direct:test
      `);

      const entities = getRestEntities(camelResource.getEntities());

      render(
        <RestTreeToolbar
          entities={entities}
          selectedElement={{ entityId: 'route-1234', modelPath: 'route' }}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const addMethodButton = screen.getByText('Add Operation').closest('li');
      expect(addMethodButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Delete button', () => {
    it('should be disabled when nothing is selected', () => {
      const entities: BaseVisualCamelEntity[] = [];

      render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const deleteButton = screen.getByText('Delete').closest('li');
      expect(deleteButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should be enabled when an element is selected', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = getRestEntities(camelResource.getEntities());

      render(
        <RestTreeToolbar
          entities={entities}
          selectedElement={{ entityId: 'rest-1234', modelPath: 'rest' }}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole('button', { name: 'Actions' });
      fireEvent.click(menuButton);

      const deleteButton = screen.getByText('Delete').closest('li');
      expect(deleteButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should fire callback when clicked', async () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = getRestEntities(camelResource.getEntities());

      render(
        <RestTreeToolbar
          entities={entities}
          selectedElement={{ entityId: 'rest-1234', modelPath: 'rest' }}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      await clickToolbarActionUtil('Delete');
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('AddMethodModal', () => {
    it('should open when Add Method button is clicked', async () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = getRestEntities(camelResource.getEntities());

      render(
        <TestWrapper>
          <RestTreeToolbar
            entities={entities}
            selectedElement={{ entityId: 'rest-1234', modelPath: 'rest' }}
            onAddRestConfiguration={mockOnAddRestConfiguration}
            onAddRest={mockOnAddRest}
            onAddMethod={mockOnAddMethod}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      await clickToolbarActionUtil('Add Operation');

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add REST Method')).toBeInTheDocument();
    });

    it('should close when cancel button is clicked', async () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = getRestEntities(camelResource.getEntities());

      render(
        <TestWrapper>
          <RestTreeToolbar
            entities={entities}
            selectedElement={{ entityId: 'rest-1234', modelPath: 'rest' }}
            onAddRestConfiguration={mockOnAddRestConfiguration}
            onAddRest={mockOnAddRest}
            onAddMethod={mockOnAddMethod}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      await clickToolbarActionUtil('Add Operation');

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should receive onAddMethod callback prop', async () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = getRestEntities(camelResource.getEntities());

      render(
        <TestWrapper>
          <RestTreeToolbar
            entities={entities}
            selectedElement={{ entityId: 'rest-1234', modelPath: 'rest' }}
            onAddRestConfiguration={mockOnAddRestConfiguration}
            onAddRest={mockOnAddRest}
            onAddMethod={mockOnAddMethod}
            onDelete={mockOnDelete}
          />
        </TestWrapper>,
      );

      await clickToolbarActionUtil('Add Operation');

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add REST Method')).toBeInTheDocument();
    });
  });
});
