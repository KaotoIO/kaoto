import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
} from '../../../../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  IfItem,
  MappingTree,
  SortItem,
  ValueOfSelector,
} from '../../../../models/datamapper/mapping';
import { MappingActionGroup } from '../../../../models/datamapper/mapping-action';
import {
  AddMappingNodeData,
  FieldItemNodeData,
  ISourceDocumentContext,
  MappingNodeData,
  NodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../../../models/datamapper/visualization';
import { XmlSchemaDocumentService } from '../../../../services/document/xml-schema/xml-schema-document.service';
import { MappingService } from '../../../../services/mapping/mapping.service';
import { MappingActionService } from '../../../../services/visualization/mapping-action.service';
import { MappingActionRegistryService } from '../../../../services/visualization/mapping-action-registry.service';
import { TargetRenderService } from '../../../../services/visualization/target-render.service';
import { VisualizationService } from '../../../../services/visualization/visualization.service';
import { useDocumentTreeStore } from '../../../../store/document-tree.store';
import { getAdtInXsd, TestUtil } from '../../../../stubs/datamapper/data-mapper';
import {
  createDataMapperContext,
  createDataMapperContextWrapper,
} from '../../../../stubs/datamapper/data-mapper-context';
import { MappingContextMenuAction } from './MappingContextMenuAction';

const SHIP_ORDER_NS = 'io.kaoto.datamapper.poc.test';
const BODY_NOTE = '/ns0:ShipOrder/Item/Note';
const BODY_TITLE = '/ns0:ShipOrder/Item/Title';

const findField = (parent: IDocument | IField, name: string): IField => {
  const field = parent.fields.find((child) => child.name === name);
  if (!field) throw new Error(`No field named '${name}'`);
  return field;
};

const createAdtDocument = (documentType: DocumentType): IDocument => {
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(
    new DocumentDefinition(documentType, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
      'ADT_IN.xsd': getAdtInXsd(),
    }),
  );
  if (!result.document) throw new Error('Failed to create the ADT_IN document');
  return result.document;
};

const findFieldRow = (nodes: NodeData[], fieldItem: FieldItem): FieldItemNodeData | undefined => {
  for (const node of nodes) {
    if (node instanceof FieldItemNodeData && node.mapping === fieldItem) return node;
    if (node instanceof MappingNodeData) {
      const row = findFieldRow(VisualizationService.generateNonDocumentNodeDataChildren(node), fieldItem);
      if (row) return row;
    }
  }
  return undefined;
};

const getFieldRow = (documentNode: TargetDocumentNodeData, fieldItem: FieldItem): FieldItemNodeData => {
  const row = findFieldRow(VisualizationService.generateStructuredDocumentChildren(documentNode), fieldItem);
  if (!row) throw new Error(`No row renders '${fieldItem.field.name}'`);
  return row;
};

describe('MappingContextMenuAction', () => {
  let targetDoc: ReturnType<typeof TestUtil.createTargetOrderDoc>;
  let mappingTree: MappingTree;
  let documentNodeData: TargetDocumentNodeData;

  beforeEach(() => {
    targetDoc = TestUtil.createTargetOrderDoc();
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    documentNodeData = new TargetDocumentNodeData(targetDoc, mappingTree);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    act(() => {
      useDocumentTreeStore.getState().setOpenMappingMenuId(null);
    });
  });

  it('should apply ValueSelector', async () => {
    const user = userEvent.setup();
    // Use a leaf element field: value-of is not allowed on fields with element children
    const leafField = targetDoc.fields[0].fields[1];
    const nodeData = new TargetFieldNodeData(documentNodeData, leafField, new FieldItem(mappingTree, leafField));
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingActionService, 'applyValueOfSelector');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    await user.click(actionToggle);
    const selectorItem = await screen.findByTestId('transformation-actions-selector');
    await user.click(selectorItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });
    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should not offer ValueSelector on a field with element children', async () => {
    const user = userEvent.setup();
    const shipOrderRow = VisualizationService.generateStructuredDocumentChildren(documentNodeData)[0];
    const shipToRow = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderRow).find(
      (row) => row.title === 'ShipTo',
    );
    if (!(shipToRow instanceof TargetFieldNodeData)) throw new Error('ShipTo row not found');
    render(<MappingContextMenuAction nodeData={shipToRow} onUpdate={vi.fn()} />);

    await user.click(screen.getByTestId('transformation-actions-menu-toggle'));
    const copyOfItem = await screen.findByTestId('transformation-actions-copy-of');
    expect(copyOfItem.getElementsByTagName('button')[0]).not.toBeDisabled();
    expect(screen.queryByTestId('transformation-actions-selector')).not.toBeInTheDocument();
  });

  it('should reflect in-place model changes when reopened for the same node', async () => {
    const user = userEvent.setup();
    const chooseItem = new ChooseItem(mappingTree, targetDoc.fields[0]);
    mappingTree.children.push(chooseItem);
    const nodeData = new MappingNodeData(documentNodeData, chooseItem);
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={() => {}} />);

    await user.click(screen.getByTestId('transformation-actions-menu-toggle'));
    const otherwiseItem = await screen.findByTestId('transformation-actions-otherwise');
    await user.click(otherwiseItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });

    await user.click(screen.getByTestId('transformation-actions-menu-toggle'));
    await screen.findByTestId('transformation-actions-when');
    expect(screen.queryByTestId('transformation-actions-otherwise')).not.toBeInTheDocument();
  });

  it('should not evaluate the menu of other rows when one opens', async () => {
    const user = userEvent.setup();
    const shipOrderRow = VisualizationService.generateStructuredDocumentChildren(documentNodeData)[0];
    const rows = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderRow);
    const orderPersonRow = rows.find((row) => row.title === 'OrderPerson');
    const shipToRow = rows.find((row) => row.title === 'ShipTo');
    if (!(orderPersonRow instanceof TargetFieldNodeData) || !(shipToRow instanceof TargetFieldNodeData)) {
      throw new Error('ShipOrder rows not found');
    }
    render(
      <>
        <MappingContextMenuAction nodeData={orderPersonRow} onUpdate={vi.fn()} />
        <MappingContextMenuAction nodeData={shipToRow} onUpdate={vi.fn()} />
      </>,
    );
    const getMenuItemsSpy = vi.spyOn(MappingActionRegistryService, 'getMappingContextMenuItems');

    const [orderPersonToggle] = screen.getAllByTestId('transformation-actions-menu-toggle');
    await user.click(orderPersonToggle);
    await waitFor(() => {
      expect(orderPersonToggle.getAttribute('aria-expanded')).toBe('true');
    });

    expect(getMenuItemsSpy).toHaveBeenCalledWith(orderPersonRow);
    expect(getMenuItemsSpy).not.toHaveBeenCalledWith(shipToRow);
  });

  it('should apply If', async () => {
    const user = userEvent.setup();
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingActionService, 'applyIf');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    await user.click(actionToggle);
    const wrapFlyout = await screen.findByTestId(
      `transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`,
    );
    await user.click(wrapFlyout.getElementsByTagName('button')[0]);
    const ifItem = await screen.findByTestId('transformation-actions-if');
    await user.click(ifItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });
    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should apply choose', async () => {
    const user = userEvent.setup();
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingActionService, 'applyChooseWhenOtherwise');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    await user.click(actionToggle);
    const wrapFlyout = await screen.findByTestId(
      `transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`,
    );
    await user.click(wrapFlyout.getElementsByTagName('button')[0]);
    const chooseItem = await screen.findByTestId('transformation-actions-choose');
    await user.click(chooseItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });
    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should apply when', async () => {
    const user = userEvent.setup();
    const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingService, 'addWhen');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    await user.click(actionToggle);
    const whenItem = await screen.findByTestId('transformation-actions-when');
    await user.click(whenItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });

    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should apply otherwise', async () => {
    const user = userEvent.setup();
    const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingService, 'addOtherwise');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    await user.click(actionToggle);
    const otherwiseItem = await screen.findByTestId('transformation-actions-otherwise');
    await user.click(otherwiseItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });

    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should apply for-each', async () => {
    const user = userEvent.setup();
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0].fields[3],
      new FieldItem(mappingTree, targetDoc.fields[0].fields[3]),
    );
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingActionService, 'applyForEach');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    await user.click(actionToggle);
    const wrapFlyout = await screen.findByTestId(
      `transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`,
    );
    await user.click(wrapFlyout.getElementsByTagName('button')[0]);
    const foreachItem = await screen.findByTestId('transformation-actions-foreach');
    await user.click(foreachItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });
    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should stop event propagation upon context menu toggle', async () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0].fields[3],
      new FieldItem(mappingTree, targetDoc.fields[0].fields[3]),
    );

    const wrapper = render(<MappingContextMenuAction nodeData={nodeData} onUpdate={() => {}} />);

    const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
    const clickEvent = createEvent.click(actionToggle);
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

    fireEvent(actionToggle, clickEvent);

    await waitFor(() => {
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  it('should stop event propagation upon selecting a menu option', async () => {
    const user = userEvent.setup();
    // Use a leaf element field: value-of is not allowed on fields with element children
    const leafField = targetDoc.fields[0].fields[1];
    const nodeData = new TargetFieldNodeData(documentNodeData, leafField, new FieldItem(mappingTree, leafField));

    const wrapper = render(<MappingContextMenuAction nodeData={nodeData} onUpdate={() => {}} />);

    await user.click(wrapper.getByTestId('transformation-actions-menu-toggle'));

    const selectorItem = await wrapper.findByTestId('transformation-actions-selector');
    const selectorButton = selectorItem.getElementsByTagName('button')[0];
    const clickEvent = createEvent.click(selectorButton);
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

    fireEvent(selectorButton, clickEvent);

    await waitFor(() => {
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  it('should render Add Mapping Instruction dropdown for the add mapping placeholder', async () => {
    const user = userEvent.setup();
    const onUpdateSpy = vi.fn();
    const nodeData = new AddMappingNodeData(documentNodeData, targetDoc.fields[0].fields[3]);
    const wrapper = render(
      <MappingContextMenuAction nodeData={nodeData} dropdownLabel="Add Mapping Instruction" onUpdate={onUpdateSpy} />,
    );

    const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
    expect(actionToggle.textContent).toBe('Add Mapping Instruction');
    await user.click(actionToggle);

    const wrapFlyout = await wrapper.findByTestId(
      `transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`,
    );
    await user.click(wrapFlyout.getElementsByTagName('button')[0]);

    const forEachItem = await wrapper.findByTestId('transformation-actions-foreach');
    await user.click(forEachItem.getElementsByTagName('button')[0]);

    await waitFor(() => {
      expect(onUpdateSpy).toHaveBeenCalled();
    });
  });

  it('should apply If from the Add Mapping Instruction dropdown for the add mapping placeholder', async () => {
    const user = userEvent.setup();
    const onUpdateSpy = vi.fn();
    const nodeData = new AddMappingNodeData(documentNodeData, targetDoc.fields[0].fields[3]);
    const spyOnApply = vi.spyOn(MappingActionService, 'applyIf');
    const wrapper = render(
      <MappingContextMenuAction nodeData={nodeData} dropdownLabel="Add Mapping Instruction" onUpdate={onUpdateSpy} />,
    );

    const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
    await user.click(actionToggle);

    const wrapFlyout = await wrapper.findByTestId(
      `transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`,
    );
    await user.click(wrapFlyout.getElementsByTagName('button')[0]);

    const ifItem = await wrapper.findByTestId('transformation-actions-if');
    await user.click(ifItem.getElementsByTagName('button')[0]);

    await waitFor(() => {
      expect(onUpdateSpy).toHaveBeenCalled();
    });
    expect(spyOnApply).toHaveBeenCalledWith(nodeData);
  });

  it('should apply Choose from the Add Mapping Instruction dropdown for the add mapping placeholder', async () => {
    const user = userEvent.setup();
    const onUpdateSpy = vi.fn();
    const nodeData = new AddMappingNodeData(documentNodeData, targetDoc.fields[0].fields[3]);
    const spyOnApply = vi.spyOn(MappingActionService, 'applyChooseWhenOtherwise');
    const wrapper = render(
      <MappingContextMenuAction nodeData={nodeData} dropdownLabel="Add Mapping Instruction" onUpdate={onUpdateSpy} />,
    );

    const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
    await user.click(actionToggle);

    const wrapFlyout = await wrapper.findByTestId(
      `transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`,
    );
    await user.click(wrapFlyout.getElementsByTagName('button')[0]);

    const chooseItem = await wrapper.findByTestId('transformation-actions-choose');
    await user.click(chooseItem.getElementsByTagName('button')[0]);

    await waitFor(() => {
      expect(onUpdateSpy).toHaveBeenCalled();
    });
    expect(spyOnApply).toHaveBeenCalledWith(nodeData);
  });

  describe('Comment Functionality', () => {
    describe('Comment Dropdown Item Rendering', () => {
      it('should render comment dropdown item when nodeData has a mapping item', async () => {
        const user = userEvent.setup();
        const nodeData = new TargetFieldNodeData(
          documentNodeData,
          targetDoc.fields[0],
          new FieldItem(mappingTree, targetDoc.fields[0]),
        );
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        await user.click(actionToggle);

        // Comment item should be visible
        const commentItem = await screen.findByTestId('transformation-actions-comment');
        expect(commentItem).toBeInTheDocument();
        await user.click(actionToggle);
      });

      it('should display "Edit Comment" when there is an existing comment', async () => {
        const user = userEvent.setup();
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        fieldItem.comment = 'Existing comment';
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = await screen.findByTestId('transformation-actions-menu-toggle');
        await user.click(actionToggle);

        const commentItem = await screen.findByTestId('transformation-actions-comment');
        expect(commentItem).toHaveTextContent('Edit Comment');
        await user.click(actionToggle);
      });
    });

    describe('Comment Modal Opening', () => {
      it('should open CommentModal when comment dropdown item is clicked', async () => {
        const user = userEvent.setup();
        const nodeData = new TargetFieldNodeData(
          documentNodeData,
          targetDoc.fields[0],
          new FieldItem(mappingTree, targetDoc.fields[0]),
        );
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        await user.click(actionToggle);

        // Click the comment item
        const commentItem = await screen.findByTestId('transformation-actions-comment');
        await user.click(commentItem.getElementsByTagName('button')[0]);

        // Modal should be open
        expect(await screen.findByTestId('comment-modal')).toBeInTheDocument();
      });
    });

    describe('CommentModal Rendering', () => {
      it('should render CommentModal when mappingItem exists', async () => {
        const user = userEvent.setup();
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        await user.click(actionToggle);

        // Click the comment item to open modal
        const commentItem = await screen.findByTestId('transformation-actions-comment');
        await user.click(commentItem.getElementsByTagName('button')[0]);

        expect(await screen.findByTestId('comment-modal')).toBeInTheDocument();
      });

      it('should pass correct mapping to CommentModal', async () => {
        const user = userEvent.setup();
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        fieldItem.comment = 'Test comment';
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        await user.click(actionToggle);

        // Click the comment item to open modal
        const commentItem = await screen.findByTestId('transformation-actions-comment');
        await user.click(commentItem.getElementsByTagName('button')[0]);

        // Modal should display the comment
        const textarea = (await screen.findByTestId('comment-textarea')) as HTMLTextAreaElement;
        expect(textarea.value).toBe('Test comment');
      });
    });

    describe('CommentModal Closing', () => {
      it('should close CommentModal when handleCloseCommentModal is called', async () => {
        const user = userEvent.setup();
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        await user.click(actionToggle);

        // Click the comment item to open modal
        const commentItem = await screen.findByTestId('transformation-actions-comment');
        await user.click(commentItem.getElementsByTagName('button')[0]);

        const modal = await screen.findByTestId('comment-modal');
        expect(modal).toBeInTheDocument();

        // Close the modal
        const cancelButton = screen.getByTestId('cancel-comment-btn');
        await user.click(cancelButton);

        // Modal should be closed
        await waitFor(() => {
          expect(screen.queryByTestId('comment-modal')).not.toBeInTheDocument();
        });
      });
    });

    describe('Comment Modal Integration', () => {
      it('should update comment and close modal when Create is clicked', async () => {
        const user = userEvent.setup();
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        await user.click(actionToggle);

        // Click the comment item to open modal
        const commentItem = await screen.findByTestId('transformation-actions-comment');
        await user.click(commentItem.getElementsByTagName('button')[0]);

        // Add a comment
        const textarea = await screen.findByTestId('comment-textarea');
        await user.type(textarea, 'New test comment');

        const createButton = screen.getByTestId('create-comment-btn');
        await user.click(createButton);

        // Modal should close
        await waitFor(() => {
          expect(screen.queryByTestId('comment-modal')).not.toBeInTheDocument();
        });

        // Comment should be set
        expect(fieldItem.comment).toBe('New test comment');
      });
    });
  });

  describe('Sort Functionality', () => {
    it('should open SortModal when Sort action is clicked on a ForEachItem', async () => {
      const user = userEvent.setup();
      const forEachItem = new ForEachItem(mappingTree);
      const nodeData = new MappingNodeData(documentNodeData, forEachItem);
      const onUpdateMock = vi.fn();
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, {
        wrapper: createDataMapperContextWrapper(createDataMapperContext({ mappingTree })),
      });

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      await user.click(actionToggle);

      const sortItem = await screen.findByTestId('transformation-actions-sort');
      await user.click(sortItem.getElementsByTagName('button')[0]);

      expect(await screen.findByTestId('sort-modal')).toBeInTheDocument();
    });

    it('should display "Edit Sort" when ForEachItem has existing sort items', async () => {
      const user = userEvent.setup();
      const forEachItem = new ForEachItem(mappingTree);
      const sort = new SortItem();
      sort.expression = 'Title';
      forEachItem.sortItems = [sort];
      const nodeData = new MappingNodeData(documentNodeData, forEachItem);
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      await user.click(actionToggle);

      const sortAction = await screen.findByTestId('transformation-actions-sort');
      expect(sortAction).toHaveTextContent('Edit Sort');
    });
  });

  describe('For-each-group Functionality', () => {
    it('should open the for-each-group configuration from a for-each-group row', async () => {
      const user = userEvent.setup();
      const nodeData = new MappingNodeData(documentNodeData, new ForEachGroupItem(mappingTree));
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />, {
        wrapper: createDataMapperContextWrapper(createDataMapperContext({ mappingTree })),
      });

      await user.click(screen.getByTestId('transformation-actions-menu-toggle'));
      const configItem = await screen.findByTestId('transformation-actions-foreach-group-config');
      expect(configItem).toHaveTextContent('Configure for-each-group');
      await user.click(configItem.getElementsByTagName('button')[0]);

      expect(await screen.findByTestId('for-each-group-modal')).toBeInTheDocument();
    });

    it('should open the field picker from "Add field" in a for-each-group under a container field', async () => {
      const user = userEvent.setup();
      const shipOrderItem = new FieldItem(mappingTree, targetDoc.fields[0]);
      mappingTree.children.push(shipOrderItem);
      const forEachGroupItem = new ForEachGroupItem(shipOrderItem);
      shipOrderItem.children.push(forEachGroupItem);
      const nodeData = new MappingNodeData(documentNodeData, forEachGroupItem);
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      await user.click(screen.getByTestId('transformation-actions-menu-toggle'));
      const addFieldItem = await screen.findByTestId('transformation-actions-add-field');
      expect(addFieldItem).toHaveTextContent('Add field');
      await user.click(addFieldItem.getElementsByTagName('button')[0]);

      expect(await screen.findByTestId('add-field-in-instruction-modal')).toBeInTheDocument();
    });
  });

  describe('Single open menu enforcement', () => {
    afterEach(() => {
      act(() => {
        useDocumentTreeStore.getState().setOpenMappingMenuId(null);
      });
    });

    it('should close first menu when second menu toggle is clicked', async () => {
      const user = userEvent.setup();
      const nodeData1 = new TargetFieldNodeData(
        documentNodeData,
        targetDoc.fields[0],
        new FieldItem(mappingTree, targetDoc.fields[0]),
      );
      const nodeData2 = new TargetFieldNodeData(
        documentNodeData,
        targetDoc.fields[0].fields[0],
        new FieldItem(mappingTree, targetDoc.fields[0].fields[0]),
      );
      render(
        <>
          <MappingContextMenuAction nodeData={nodeData1} onUpdate={vi.fn()} />
          <MappingContextMenuAction nodeData={nodeData2} onUpdate={vi.fn()} />
        </>,
      );

      const [firstToggle, secondToggle] = screen.getAllByTestId('transformation-actions-menu-toggle');

      await user.click(firstToggle);
      await waitFor(() => {
        expect(firstToggle.getAttribute('aria-expanded')).toBe('true');
      });

      await user.click(secondToggle);
      await waitFor(() => {
        expect(firstToggle.getAttribute('aria-expanded')).toBe('false');
        expect(secondToggle.getAttribute('aria-expanded')).toBe('true');
      });
    });
  });

  describe('Menu entries', () => {
    let nodeData: TargetFieldNodeData;

    beforeEach(() => {
      nodeData = new TargetFieldNodeData(
        documentNodeData,
        targetDoc.fields[0],
        new FieldItem(mappingTree, targetDoc.fields[0]),
      );
    });

    it('should not compute the entries until the menu is opened', async () => {
      const user = userEvent.setup();
      const getMenuItemsSpy = vi.spyOn(MappingActionRegistryService, 'getMappingContextMenuItems');
      const { rerender } = render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);
      rerender(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      expect(getMenuItemsSpy).not.toHaveBeenCalled();

      await user.click(screen.getByTestId('transformation-actions-menu-toggle'));

      expect(await screen.findByTestId('transformation-actions-comment')).toBeInTheDocument();
      expect(getMenuItemsSpy).toHaveBeenCalledWith(nodeData);
    });

    it('should remove the entries once the menu is closed', async () => {
      const user = userEvent.setup();
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);
      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      await user.click(actionToggle);
      expect(await screen.findByTestId('transformation-actions-comment')).toBeInTheDocument();

      await user.click(actionToggle);

      await waitFor(() => {
        expect(screen.queryByTestId('transformation-actions-comment')).not.toBeInTheDocument();
      });
      expect(actionToggle.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('Flyout Submenus', () => {
    it('should render "Wrap with Instruction" flyout when wrap actions are allowed', async () => {
      const user = userEvent.setup();
      const nodeData = new TargetFieldNodeData(
        documentNodeData,
        targetDoc.fields[0],
        new FieldItem(mappingTree, targetDoc.fields[0]),
      );
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      await user.click(actionToggle);

      expect(
        await screen.findByTestId(`transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`),
      ).toBeInTheDocument();
    });

    it('should contain correct actions in "Wrap with Instruction" flyout', async () => {
      const user = userEvent.setup();
      const nodeData = new TargetFieldNodeData(
        documentNodeData,
        targetDoc.fields[0],
        new FieldItem(mappingTree, targetDoc.fields[0]),
      );
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = await screen.findByTestId('transformation-actions-menu-toggle');
      await user.click(actionToggle);

      const wrapFlyout = await screen.findByTestId(
        `transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`,
      );
      await user.hover(wrapFlyout.getElementsByTagName('button')[0]);

      expect(await screen.findByTestId('transformation-actions-if')).toBeInTheDocument();
      expect(await screen.findByTestId('transformation-actions-choose')).toBeInTheDocument();
    });

    it('should contain correct actions in "Inner Instruction" flyout', async () => {
      const user = userEvent.setup();
      const forEachItem = new ForEachItem(mappingTree);
      const nodeData = new MappingNodeData(documentNodeData, forEachItem);
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = await screen.findByTestId('transformation-actions-menu-toggle');
      await user.click(actionToggle);

      const innerFlyout = await screen.findByTestId(
        `transformation-actions-group-${MappingActionGroup.InnerInstruction}`,
      );
      await user.hover(innerFlyout.getElementsByTagName('button')[0]);

      expect(await screen.findByTestId('transformation-actions-foreach-inner')).toBeInTheDocument();
      expect(await screen.findByTestId('transformation-actions-if-inner')).toBeInTheDocument();
      expect(await screen.findByTestId('transformation-actions-choose-inner')).toBeInTheDocument();
    });

    it('should render ungrouped actions as direct top-level items', async () => {
      const user = userEvent.setup();
      // Use a leaf element field: value-of is not allowed on fields with element children
      const leafField = targetDoc.fields[0].fields[1];
      const nodeData = new TargetFieldNodeData(documentNodeData, leafField, new FieldItem(mappingTree, leafField));
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = await screen.findByTestId('transformation-actions-menu-toggle');
      await user.click(actionToggle);

      expect(await screen.findByTestId('transformation-actions-selector')).toBeInTheDocument();
      expect(await screen.findByTestId('transformation-actions-comment')).toBeInTheDocument();
    });

    it('should not render flyout parent when all group actions are filtered out', async () => {
      const user = userEvent.setup();
      const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = await screen.findByTestId('transformation-actions-menu-toggle');
      await user.click(actionToggle);

      const menuItems = MappingActionRegistryService.getMappingContextMenuItems(nodeData);
      const hasWrapGroup = menuItems.some((item) => item.group === MappingActionGroup.WrapWithInstruction);
      const hasInnerGroup = menuItems.some((item) => item.group === MappingActionGroup.InnerInstruction);
      expect(hasWrapGroup).toBe(false);
      expect(hasInnerGroup).toBe(false);
      expect(
        screen.queryByTestId(`transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`transformation-actions-group-${MappingActionGroup.InnerInstruction}`),
      ).not.toBeInTheDocument();
    });
  });

  describe('optional guard actions', () => {
    let sourceContext: ISourceDocumentContext;
    let itemItem: FieldItem;
    let noteField: IField;

    beforeEach(() => {
      sourceContext = { sourceParameterMap: new Map<string, IDocument>(), sourceBody: TestUtil.createSourceOrderDoc() };
      mappingTree.namespaceMap = { ns0: SHIP_ORDER_NS };
      const shipOrderItem = MappingService.createFieldItem(mappingTree, findField(targetDoc, 'ShipOrder'));
      itemItem = MappingService.createFieldItem(shipOrderItem, findField(shipOrderItem.field, 'Item'));
      noteField = findField(itemItem.field, 'Note');
    });

    const addIf = (test: string) => {
      const ifItem = new IfItem(itemItem);
      ifItem.expression = test;
      itemItem.children.push(ifItem);
      return ifItem;
    };

    const mapNote = (parent: FieldItem | IfItem, expression: string) => {
      const noteItem = MappingService.createFieldItem(parent, noteField);
      const selector = new ValueOfSelector(noteItem);
      selector.expression = expression;
      noteItem.children.push(selector);
      return noteItem;
    };

    const getNoteRow = (noteItem: FieldItem) =>
      getFieldRow(
        new TargetDocumentNodeData(targetDoc, mappingTree, TargetRenderService.buildIndex(mappingTree, sourceContext)),
        noteItem,
      );

    const openMenu = async (nodeData: TargetNodeData, onUpdate: () => void = vi.fn()) => {
      const user = userEvent.setup();
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdate} />);
      await user.click(screen.getByTestId('transformation-actions-menu-toggle'));
      await screen.findByTestId('transformation-actions-comment');
      return user;
    };

    it('should offer "Add optional guard" for an optional field mapped from an optional source, and wrap it in a guard the tree absorbs', async () => {
      const noteItem = mapNote(itemItem, BODY_NOTE);
      const onUpdateMock = vi.fn();
      const user = await openMenu(getNoteRow(noteItem), onUpdateMock);

      expect(screen.queryByTestId('transformation-actions-remove-optional-guard')).not.toBeInTheDocument();
      const addGuardItem = screen.getByTestId('transformation-actions-add-optional-guard');
      await user.click(addGuardItem.getElementsByTagName('button')[0]);

      await waitFor(() => {
        expect(onUpdateMock.mock.calls).toHaveLength(1);
      });
      const guard = noteItem.parent as IfItem;
      expect(guard).toBeInstanceOf(IfItem);
      expect(guard.expression).toBe(BODY_NOTE);
      expect(TargetRenderService.buildIndex(mappingTree, sourceContext).getAbsorbingField(guard)).toBe(noteItem);
    });

    it('should not offer "Add optional guard" when the source is required', async () => {
      await openMenu(getNoteRow(mapNote(itemItem, BODY_TITLE)));

      expect(screen.queryByTestId('transformation-actions-add-optional-guard')).not.toBeInTheDocument();
    });

    it('should not offer "Add optional guard" when the selector is not a simple path', async () => {
      await openMenu(getNoteRow(mapNote(itemItem, `upper-case(${BODY_NOTE})`)));

      expect(screen.queryByTestId('transformation-actions-add-optional-guard')).not.toBeInTheDocument();
    });

    it('should not offer either optional guard action for a field under a visible if', async () => {
      const ifItem = addIf(`${BODY_NOTE} != ''`);
      const noteRow = getNoteRow(mapNote(ifItem, BODY_NOTE));
      expect(noteRow.renderIndex.isAbsorbed(ifItem)).toBe(false);

      await openMenu(noteRow);

      expect(screen.queryByTestId('transformation-actions-add-optional-guard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('transformation-actions-remove-optional-guard')).not.toBeInTheDocument();
    });

    it('should not offer "Add optional guard" for an optional container mapped by child fields instead of a single selector', async () => {
      const adtSourceDoc = createAdtDocument(DocumentType.SOURCE_BODY);
      const adtTargetDoc = createAdtDocument(DocumentType.TARGET_BODY);
      const adtTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const hl7Item = MappingService.createFieldItem(adtTree, findField(adtTargetDoc, 'HL7'));
      const pidItem = MappingService.createFieldItem(hl7Item, findField(hl7Item.field, 'PID'));
      MappingService.generateAutoChildMappings(
        findField(findField(adtSourceDoc, 'HL7'), 'PID'),
        pidItem.field,
        pidItem,
      );
      expect(pidItem.field.minOccurs).toBe(0);
      expect(pidItem.children.length).toBeGreaterThan(0);
      expect(pidItem.soleSelector).toBeUndefined();
      const renderIndex = TargetRenderService.buildIndex(adtTree, {
        sourceParameterMap: new Map<string, IDocument>(),
        sourceBody: adtSourceDoc,
      });

      await openMenu(getFieldRow(new TargetDocumentNodeData(adtTargetDoc, adtTree, renderIndex), pidItem));

      expect(screen.queryByTestId('transformation-actions-add-optional-guard')).not.toBeInTheDocument();
    });

    it('should offer only "Remove optional guard" for a row whose guard is absorbed, and keep the guard comment on the field', async () => {
      const guard = addIf(BODY_NOTE);
      guard.comment = 'Only when the item has a note';
      const noteItem = mapNote(guard, BODY_NOTE);
      const noteRow = getNoteRow(noteItem);
      expect(noteRow.autoOptionalIfItem).toBe(guard);
      const onUpdateMock = vi.fn();
      const user = await openMenu(noteRow, onUpdateMock);

      expect(screen.queryByTestId('transformation-actions-add-optional-guard')).not.toBeInTheDocument();
      const removeGuardItem = screen.getByTestId('transformation-actions-remove-optional-guard');
      await user.click(removeGuardItem.getElementsByTagName('button')[0]);

      await waitFor(() => {
        expect(onUpdateMock.mock.calls).toHaveLength(1);
      });
      expect(itemItem.children).toEqual([noteItem]);
      expect(noteItem.parent).toBe(itemItem);
      expect(noteItem.comment).toBe('Only when the item has a note');
    });
  });
});
