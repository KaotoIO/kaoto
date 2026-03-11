import { SuggestionRegistryProvider } from '@kaoto/forms';
import { fireEvent, render, screen } from '@testing-library/react';

import { CamelResourceFactory } from '../../../models/camel/camel-resource-factory';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { CamelRestConfigurationVisualEntity } from '../../../models/visualization/flows/camel-rest-configuration-visual-entity';
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

      const entities = camelResource.getVisualEntities();

      render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const addRestConfigButton = screen.getByText('Add Configuration');
      expect(addRestConfigButton).toBeDisabled();
    });

    it('should be enabled when no RestConfiguration exists', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = camelResource.getVisualEntities();

      render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      const addRestConfigButton = screen.getByText('Add Configuration');
      expect(addRestConfigButton).not.toBeDisabled();
    });

    it('should fire callback when clicked', () => {
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

      const addRestConfigButton = screen.getByText('Add Configuration');
      fireEvent.click(addRestConfigButton);
      expect(mockOnAddRestConfiguration).toHaveBeenCalledTimes(1);
    });
  });

  describe('Add Rest button', () => {
    it('should always be enabled', () => {
      const entities: BaseVisualCamelEntity[] = [];

      const { rerender } = render(
        <RestTreeToolbar
          entities={entities}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      let addRestButton = screen.getByRole('button', { name: 'Add Service' });
      expect(addRestButton).not.toBeDisabled();

      // Test with entities present
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
- restConfiguration:
    host: localhost
      `);

      const entitiesWithData = camelResource.getVisualEntities();

      rerender(
        <RestTreeToolbar
          entities={entitiesWithData}
          onAddRestConfiguration={mockOnAddRestConfiguration}
          onAddRest={mockOnAddRest}
          onAddMethod={mockOnAddMethod}
          onDelete={mockOnDelete}
        />,
      );

      addRestButton = screen.getByRole('button', { name: 'Add Service' });
      expect(addRestButton).not.toBeDisabled();
    });

    it('should fire callback when clicked', () => {
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

      const addRestButton = screen.getByText('Add Service');
      fireEvent.click(addRestButton);
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

      const addMethodButton = screen.getByText('Add Operation');
      expect(addMethodButton).toBeDisabled();
    });

    it('should be disabled when RestConfiguration is selected', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- restConfiguration:
    host: localhost
    port: "8080"
      `);

      const entities = camelResource.getVisualEntities();
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

      const addMethodButton = screen.getByText('Add Operation');
      expect(addMethodButton).toBeDisabled();
    });

    it('should be enabled when Rest entity is selected', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
    get:
      - id: get-1
        path: /test
        to:
          uri: direct:test
      `);

      const entities = camelResource.getVisualEntities();

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

      const addMethodButton = screen.getByText('Add Operation');
      expect(addMethodButton).not.toBeDisabled();
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

      const deleteButton = screen.getByText('Delete');
      expect(deleteButton).toBeDisabled();
    });

    it('should be enabled when an element is selected', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = camelResource.getVisualEntities();

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

      const deleteButton = screen.getByText('Delete');
      expect(deleteButton).not.toBeDisabled();
    });

    it('should fire callback when clicked', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = camelResource.getVisualEntities();

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

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('AddMethodModal', () => {
    it('should open when Add Method button is clicked', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = camelResource.getVisualEntities();

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

      const addMethodButton = screen.getByText('Add Operation');
      fireEvent.click(addMethodButton);

      expect(screen.getByTestId('add-method-modal')).toBeInTheDocument();
      expect(screen.getByText('Add REST Method')).toBeInTheDocument();
    });

    it('should close when cancel button is clicked', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = camelResource.getVisualEntities();

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

      // Open modal
      const addMethodButton = screen.getByText('Add Operation');
      fireEvent.click(addMethodButton);

      expect(screen.getByTestId('add-method-modal')).toBeInTheDocument();

      // Close modal
      const cancelButton = screen.getByTestId('add-method-modal-cancel-btn');
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId('add-method-modal')).not.toBeInTheDocument();
    });

    it('should receive onAddMethod callback prop', () => {
      const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1234
      `);

      const entities = camelResource.getVisualEntities();

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

      // Open modal
      const addMethodButton = screen.getByText('Add Operation');
      fireEvent.click(addMethodButton);

      // Verify modal is rendered with the form
      expect(screen.getByTestId('add-method-modal')).toBeInTheDocument();
      expect(screen.getByText('Add REST Method')).toBeInTheDocument();

      // The modal receives the onAddMethod callback prop
      // The actual form interaction is tested in AddMethodModal.test.tsx
    });
  });
});
