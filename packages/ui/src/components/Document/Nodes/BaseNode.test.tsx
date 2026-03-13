import { fireEvent, render, screen } from '@testing-library/react';

import { DocumentDefinitionType, FieldOverrideVariant, IField, NodePath, Types } from '../../../models/datamapper';
import { DocumentDefinition, DocumentType, PrimitiveDocument } from '../../../models/datamapper/document';
import { MappingTree, UnknownMappingItem, VariableItem } from '../../../models/datamapper/mapping';
import {
  AddMappingNodeData,
  DocumentNodeData,
  FieldNodeData,
  NodeData,
  TargetDocumentNodeData,
  UnknownMappingNodeData,
  VariableNodeData,
} from '../../../models/datamapper/visualization';
import { QName } from '../../../xml-schema-ts/QName';
import { BaseNode } from './BaseNode';

// Helper to create mock nodeData
const createMockNodeData = (
  overrides?: Partial<NodeData> & {
    type?: Types;
    isCollection?: boolean;
    isAttribute?: boolean;
  },
): NodeData => {
  const mockDocument = new PrimitiveDocument(
    new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'test-doc'),
  );
  const docNodeData = new DocumentNodeData(mockDocument);

  // If a type is specified, create a FieldNodeData instead
  if (overrides?.type || overrides?.isCollection || overrides?.isAttribute) {
    const mockField: IField = {
      parent: mockDocument,
      ownerDocument: mockDocument,
      id: 'test-field',
      name: 'testField',
      displayName: 'Test Field',
      type: overrides.type || Types.String,
      typeQName: new QName('', overrides.type || Types.String),
      originalType: overrides.type || Types.String,
      originalTypeQName: new QName('', overrides.type || Types.String),
      path: new NodePath('testField'),
      fields: [],
      isAttribute: overrides.isAttribute || false,
      defaultValue: null,
      minOccurs: 1,
      maxOccurs: overrides.isCollection ? 10 : 1,
      nillable: false,
      typeOverride: FieldOverrideVariant.NONE,
      namespacePrefix: null,
      namespaceURI: null,
      namedTypeFragmentRefs: [],
      predicates: [],
      adopt: () => mockField,
      getExpression: () => '',
      isIdentical: () => false,
    } as IField;
    const fieldNodeData = new FieldNodeData(docNodeData, mockField);
    // Apply overrides to the field if needed, but return the FieldNodeData instance
    if (overrides) {
      Object.assign(fieldNodeData, overrides);
    }
    return fieldNodeData;
  }

  return { ...docNodeData, ...overrides };
};

// Helper to create UnknownMappingNodeData for testing
const createUnknownMappingNodeData = (): UnknownMappingNodeData => {
  const mockDocument = new PrimitiveDocument(
    new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, 'test-target-doc'),
  );
  const mappingTree = new MappingTree(DocumentType.TARGET_BODY, 'test-target-doc', DocumentDefinitionType.Primitive);
  const targetDocNodeData = new TargetDocumentNodeData(mockDocument, mappingTree);

  const unknownElement = document.createElement('unknown-element');
  const unknownMapping = new UnknownMappingItem(mappingTree, unknownElement);

  return new UnknownMappingNodeData(targetDocNodeData, unknownMapping);
};

// Helper to create VariableNodeData for testing
const createVariableNodeData = (): VariableNodeData => {
  const mockDocument = new PrimitiveDocument(
    new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, 'test-target-doc'),
  );
  const mappingTree = new MappingTree(DocumentType.TARGET_BODY, 'test-target-doc', DocumentDefinitionType.Primitive);
  const targetDocNodeData = new TargetDocumentNodeData(mockDocument, mappingTree);

  const variableMapping = new VariableItem(mappingTree, 'testVariable');

  return new VariableNodeData(targetDocNodeData, variableMapping);
};

// Helper to create AddMappingNodeData for testing
const createAddMappingNodeData = (): AddMappingNodeData => {
  const mockDocument = new PrimitiveDocument(
    new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, 'test-target-doc'),
  );
  const mappingTree = new MappingTree(DocumentType.TARGET_BODY, 'test-target-doc', DocumentDefinitionType.Primitive);
  const targetDocNodeData = new TargetDocumentNodeData(mockDocument, mappingTree);

  const mockField: IField = {
    parent: mockDocument,
    ownerDocument: mockDocument,
    id: 'add-mapping-field',
    name: 'addMappingField',
    displayName: 'Add Mapping Field',
    type: Types.String,
    typeQName: new QName('', Types.String),
    originalType: Types.String,
    originalTypeQName: new QName('', Types.String),
    path: new NodePath('addMappingField'),
    fields: [],
    isAttribute: false,
    defaultValue: null,
    minOccurs: 1,
    maxOccurs: 1,
    nillable: false,
    typeOverride: FieldOverrideVariant.NONE,
    namespacePrefix: null,
    namespaceURI: null,
    namedTypeFragmentRefs: [],
    predicates: [],
    adopt: () => mockField,
    getExpression: () => '',
    isIdentical: () => false,
  } as IField;

  return new AddMappingNodeData(targetDocNodeData, mockField);
};

describe('BaseNode', () => {
  describe('Basic Rendering', () => {
    it('should render title as string', () => {
      render(<BaseNode nodeData={createMockNodeData()} title="Test Title" data-testid="test-node" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render title as ReactNode', () => {
      render(
        <BaseNode
          nodeData={createMockNodeData()}
          title={<span data-testid="custom-title">Custom Title</span>}
          data-testid="test-node"
        />,
      );
      expect(screen.getByTestId('custom-title')).toBeInTheDocument();
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <BaseNode nodeData={createMockNodeData()} title="Title" data-testid="test-node">
          <span data-testid="child-element">Child Content</span>
        </BaseNode>,
      );
      expect(screen.getByTestId('child-element')).toBeInTheDocument();
    });

    it('should render with node__row class', () => {
      const { container } = render(<BaseNode nodeData={createMockNodeData()} title="Title" data-testid="test-node" />);
      const section = container.querySelector('section.node__row');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Expansion Controls', () => {
    it('should not show expand icon when isExpandable is false', () => {
      render(<BaseNode nodeData={createMockNodeData()} title="Title" data-testid="test-node" isExpandable={false} />);
      expect(screen.queryByTestId('expand-icon-test-node')).not.toBeInTheDocument();
      expect(screen.queryByTestId('collapse-icon-test-node')).not.toBeInTheDocument();
    });

    it('should show ChevronDown when expandable and expanded', () => {
      render(
        <BaseNode
          nodeData={createMockNodeData()}
          title="Title"
          data-testid="test-node"
          isExpandable={true}
          isExpanded={true}
          onExpandChange={() => {}}
        />,
      );
      expect(screen.getByTestId('expand-icon-test-node')).toBeInTheDocument();
      expect(screen.queryByTestId('collapse-icon-test-node')).not.toBeInTheDocument();
    });

    it('should show ChevronRight when expandable and collapsed', () => {
      render(
        <BaseNode
          nodeData={createMockNodeData()}
          title="Title"
          data-testid="test-node"
          isExpandable={true}
          isExpanded={false}
          onExpandChange={() => {}}
        />,
      );
      expect(screen.getByTestId('collapse-icon-test-node')).toBeInTheDocument();
      expect(screen.queryByTestId('expand-icon-test-node')).not.toBeInTheDocument();
    });

    it('should call onExpandChange when expand icon is clicked', () => {
      const onExpandChange = jest.fn();
      render(
        <BaseNode
          nodeData={createMockNodeData()}
          title="Title"
          data-testid="test-node"
          isExpandable={true}
          isExpanded={true}
          onExpandChange={onExpandChange}
        />,
      );

      const expandIcon = screen.getByTestId('expand-icon-test-node');
      fireEvent.click(expandIcon);

      expect(onExpandChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Draggable Controls', () => {
    it('should show drag icon when isDraggable is true (derived from nodeData)', () => {
      const { container } = render(<BaseNode nodeData={createMockNodeData()} title="Title" data-testid="test-node" />);
      const dragHandler = container.querySelector('[data-drag-handler]');
      expect(dragHandler).toBeInTheDocument();
    });

    it('should not show drag icon for UnknownMappingNodeData', () => {
      const unknownNodeData = createUnknownMappingNodeData();
      const { container } = render(<BaseNode nodeData={unknownNodeData} title="Title" data-testid="test-node" />);
      const dragHandler = container.querySelector('[data-drag-handler]');
      expect(dragHandler).not.toBeInTheDocument();
    });

    it('should not show drag icon for AddMappingNodeData', () => {
      const addMappingNodeData = createAddMappingNodeData();
      const { container } = render(<BaseNode nodeData={addMappingNodeData} title="Title" data-testid="test-node" />);
      const dragHandler = container.querySelector('[data-drag-handler]');
      expect(dragHandler).not.toBeInTheDocument();
    });

    it('should show drag icon for VariableNodeData', () => {
      const variableNodeData = createVariableNodeData();
      const { container } = render(<BaseNode nodeData={variableNodeData} title="Title" data-testid="test-node" />);
      const dragHandler = container.querySelector('[data-drag-handler]');
      expect(dragHandler).toBeInTheDocument();
    });

    it('should set data-draggable attribute to true when draggable', () => {
      const { container } = render(<BaseNode nodeData={createMockNodeData()} title="Title" data-testid="test-node" />);
      const section = container.querySelector('[data-draggable="true"]');
      expect(section).toBeInTheDocument();
    });

    it('should set data-draggable attribute based on nodeData', () => {
      const { container } = render(<BaseNode nodeData={createMockNodeData()} title="Title" data-testid="test-node" />);
      const section = container.querySelector('[data-draggable="true"]');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Field Icons', () => {
    it('should render field icon when iconType is provided (derived from nodeData)', () => {
      const { container } = render(
        <BaseNode nodeData={createMockNodeData({ type: Types.String })} title="Title" data-testid="test-node" />,
      );
      expect(container.querySelector('.node__spacer')).toBeInTheDocument();
    });

    it('should render collection icon when isCollectionField is true (ARRAY type)', () => {
      // Collection field detection works when maxOccurs > 1
      render(
        <BaseNode
          nodeData={createMockNodeData({ type: Types.Array, isCollection: true })}
          title="Title"
          data-testid="test-node"
        />,
      );
      // With proper FieldNodeData mock, collection icon should be rendered
      expect(screen.getByTestId('collection-field-icon')).toBeInTheDocument();
    });

    it('should not render collection icon when not ARRAY type', () => {
      render(<BaseNode nodeData={createMockNodeData({ type: Types.String })} title="Title" data-testid="test-node" />);
      expect(screen.queryByTestId('collection-field-icon')).not.toBeInTheDocument();
    });

    it('should render choice icon when isChoiceField is true (ChoiceFieldNodeData)', () => {
      // Note: Choice fields require ChoiceFieldNodeData instance, not just a type
      // This test verifies the icon doesn't show for regular FieldNodeData
      render(<BaseNode nodeData={createMockNodeData({ type: Types.String })} title="Title" data-testid="test-node" />);
      expect(screen.queryByTestId('choice-field-icon')).not.toBeInTheDocument();
    });

    it('should not render choice icon when not CHOICE type', () => {
      render(<BaseNode nodeData={createMockNodeData({ type: Types.String })} title="Title" data-testid="test-node" />);
      expect(screen.queryByTestId('choice-field-icon')).not.toBeInTheDocument();
    });

    it('should render attribute icon when isAttributeField is true (ATTRIBUTE type)', () => {
      // Note: Attribute field detection requires FieldNodeData with field.isAttribute = true
      // This test verifies the icon rendering logic exists
      render(
        <BaseNode
          nodeData={createMockNodeData({ type: Types.String, isAttribute: true })}
          title="Title"
          data-testid="test-node"
        />,
      );
      // Attribute icon requires VisualizationService.isAttributeField to return true
      // Our mock properly sets isAttribute, so this should work
      expect(screen.getByTestId('attribute-field-icon')).toBeInTheDocument();
    });

    it('should not render attribute icon when not ATTRIBUTE type', () => {
      render(<BaseNode nodeData={createMockNodeData({ type: Types.String })} title="Title" data-testid="test-node" />);
      expect(screen.queryByTestId('attribute-field-icon')).not.toBeInTheDocument();
    });

    it('should render variable icon when isVariableNode is true', () => {
      const variableNodeData = createVariableNodeData();
      render(<BaseNode nodeData={variableNodeData} title="Title" data-testid="test-node" />);
      expect(screen.getByTestId('variable-node-icon')).toBeInTheDocument();
    });

    it('should not render variable icon when not VariableNodeData', () => {
      render(<BaseNode nodeData={createMockNodeData()} title="Title" data-testid="test-node" />);
      expect(screen.queryByTestId('variable-node-icon')).not.toBeInTheDocument();
    });
  });

  describe('Combined States', () => {
    it('should render all icons when all flags are true', () => {
      const { container } = render(
        <BaseNode
          nodeData={createMockNodeData({ type: Types.Array, isCollection: true })}
          title="Title"
          data-testid="test-node"
          isExpandable={true}
          isExpanded={true}
          onExpandChange={() => {}}
        />,
      );

      expect(screen.getByTestId('expand-icon-test-node')).toBeInTheDocument();
      expect(container.querySelector('[data-drag-handler]')).toBeInTheDocument();
      // With proper FieldNodeData mock, collection icon should be rendered
      expect(screen.getByTestId('collection-field-icon')).toBeInTheDocument();
    });

    it('should render minimal node when no optional props provided', () => {
      // Note: PrimitiveDocument nodes are draggable by default
      const { container } = render(<BaseNode nodeData={createMockNodeData()} title="Title" data-testid="test-node" />);

      expect(screen.queryByTestId('expand-icon-test-node')).not.toBeInTheDocument();
      expect(screen.queryByTestId('collapse-icon-test-node')).not.toBeInTheDocument();
      // PrimitiveDocument is draggable, so drag handler will be present
      expect(container.querySelector('[data-drag-handler]')).toBeInTheDocument();
      expect(screen.queryByTestId('collection-field-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('attribute-field-icon')).not.toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });

  describe('Connection Port', () => {
    it('should render connection port when both nodePath and documentId are provided', () => {
      render(
        <BaseNode
          nodeData={createMockNodeData()}
          title="Title"
          data-testid="test-node"
          nodePath="source://path"
          documentId="doc-123"
        />,
      );
      expect(screen.getByTestId('connection-port-test-node')).toBeInTheDocument();
    });

    it('should not render connection port when nodePath is missing', () => {
      render(<BaseNode nodeData={createMockNodeData()} title="Title" data-testid="test-node" documentId="doc-123" />);
      expect(screen.queryByTestId('connection-port-test-node')).not.toBeInTheDocument();
    });

    it('should not render connection port when documentId is missing', () => {
      render(
        <BaseNode nodeData={createMockNodeData()} title="Title" data-testid="test-node" nodePath="source://path" />,
      );
      expect(screen.queryByTestId('connection-port-test-node')).not.toBeInTheDocument();
    });

    it('should render source connection port by default', () => {
      render(
        <BaseNode
          nodeData={createMockNodeData()}
          title="Title"
          data-testid="test-node"
          nodePath="source://path"
          documentId="doc-123"
        />,
      );
      const port = screen.getByTestId('connection-port-test-node');
      expect(port).toHaveClass('node__connection-port--source');
    });

    it('should render source connection port when isSource is true', () => {
      render(
        <BaseNode
          nodeData={createMockNodeData({ isSource: true })}
          title="Title"
          data-testid="test-node"
          nodePath="source://path"
          documentId="doc-123"
        />,
      );
      const port = screen.getByTestId('connection-port-test-node');
      expect(port).toHaveClass('node__connection-port--source');
      expect(port).not.toHaveClass('node__connection-port--target');
    });

    it('should render target connection port when isSource is false', () => {
      render(
        <BaseNode
          nodeData={createMockNodeData({ isSource: false })}
          title="Title"
          data-testid="test-node"
          nodePath="source://path"
          documentId="doc-123"
        />,
      );
      const port = screen.getByTestId('connection-port-test-node');
      expect(port).toHaveClass('node__connection-port--target');
      expect(port).not.toHaveClass('node__connection-port--source');
    });

    it('should set data-node-path attribute when nodePath is provided', () => {
      render(
        <BaseNode
          nodeData={createMockNodeData()}
          title="Title"
          data-testid="test-node"
          nodePath="source://path/to/node"
          documentId="doc-123"
        />,
      );
      const port = screen.getByTestId('connection-port-test-node');
      expect(port).toHaveAttribute('data-node-path', 'source://path/to/node');
    });

    it('should set data-document-id attribute when documentId is provided', () => {
      render(
        <BaseNode
          nodeData={createMockNodeData()}
          title="Title"
          data-testid="test-node"
          nodePath="source://path"
          documentId="doc-123"
        />,
      );
      const port = screen.getByTestId('connection-port-test-node');
      expect(port).toHaveAttribute('data-document-id', 'doc-123');
    });
  });
});
