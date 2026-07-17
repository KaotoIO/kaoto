import { DraggableObject } from '@patternfly/react-drag-drop';
import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent } from 'react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../models/datamapper/document';
import { ChooseItem, FieldItem, ForEachItem, MappingTree, SortItem } from '../../../../models/datamapper/mapping';
import { MappingActionGroup } from '../../../../models/datamapper/mapping-action';
import {
  AddMappingNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../../../models/datamapper/visualization';
import { MappingService } from '../../../../services/mapping/mapping.service';
import { MappingActionService } from '../../../../services/visualization/mapping-action.service';
import { MappingActionRegistryService } from '../../../../services/visualization/mapping-action-registry.service';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import { MappingContextMenuAction } from './MappingContextMenuAction';

vi.mock('@patternfly/react-drag-drop', () => ({
  DragDropSort: (({ items }: { items: DraggableObject[] }) => (
    <div data-testid="drag-drop-sort">
      {items.map((item) => (
        <div key={item.id}>{item.content}</div>
      ))}
    </div>
  )) as FunctionComponent<{ items: DraggableObject[] }>,
}));

vi.mock('../../../../hooks/useDataMapper', () => ({
  useDataMapper: vi.fn().mockReturnValue({
    sourceBodyDocument: { fields: [], getReferenceId: () => '' },
    sourceParameterMap: new Map(),
    mappingTree: { namespaceMap: {} },
  }),
}));

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
  });

  it('should apply ValueSelector', async () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingActionService, 'applyValueOfSelector');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    fireEvent.click(actionToggle);
    const selectorItem = screen.getByTestId('transformation-actions-selector');
    fireEvent.click(selectorItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });
    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should apply If', async () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingActionService, 'applyIf');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    fireEvent.click(actionToggle);
    const wrapFlyout = screen.getByTestId(`transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`);
    fireEvent.click(wrapFlyout.getElementsByTagName('button')[0]);
    const ifItem = await screen.findByTestId('transformation-actions-if');
    fireEvent.click(ifItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });
    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should apply choose', async () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingActionService, 'applyChooseWhenOtherwise');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    fireEvent.click(actionToggle);
    const wrapFlyout = screen.getByTestId(`transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`);
    fireEvent.click(wrapFlyout.getElementsByTagName('button')[0]);
    const chooseItem = await screen.findByTestId('transformation-actions-choose');
    fireEvent.click(chooseItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });
    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should apply when', async () => {
    const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingService, 'addWhen');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    fireEvent.click(actionToggle);
    const whenItem = screen.getByTestId('transformation-actions-when');
    fireEvent.click(whenItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });

    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should apply otherwise', async () => {
    const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingService, 'addOtherwise');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    fireEvent.click(actionToggle);
    const otherwiseItem = screen.getByTestId('transformation-actions-otherwise');
    fireEvent.click(otherwiseItem.getElementsByTagName('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toBe('false');
    });

    expect(onUpdateMock.mock.calls).toHaveLength(1);
    expect(spyOnApply.mock.calls).toHaveLength(1);
  });

  it('should apply for-each', async () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0].fields[3],
      new FieldItem(mappingTree, targetDoc.fields[0].fields[3]),
    );
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingActionService, 'applyForEach');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    fireEvent.click(actionToggle);
    const wrapFlyout = screen.getByTestId(`transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`);
    fireEvent.click(wrapFlyout.getElementsByTagName('button')[0]);
    const foreachItem = await screen.findByTestId('transformation-actions-foreach');
    fireEvent.click(foreachItem.getElementsByTagName('button')[0]);
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
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0].fields[3],
      new FieldItem(mappingTree, targetDoc.fields[0].fields[3]),
    );

    const wrapper = render(<MappingContextMenuAction nodeData={nodeData} onUpdate={() => {}} />);

    fireEvent.click(wrapper.getByTestId('transformation-actions-menu-toggle'));

    const selectorButton = wrapper.getByTestId('transformation-actions-selector').getElementsByTagName('button')[0];
    const clickEvent = createEvent.click(selectorButton);
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

    fireEvent(selectorButton, clickEvent);

    await waitFor(() => {
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  it('should render Add Mapping Instruction dropdown for the add mapping placeholder', async () => {
    const onUpdateSpy = vi.fn();
    const nodeData = new AddMappingNodeData(documentNodeData, targetDoc.fields[0].fields[3]);
    const wrapper = render(
      <MappingContextMenuAction nodeData={nodeData} dropdownLabel="Add Mapping Instruction" onUpdate={onUpdateSpy} />,
    );

    const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
    expect(actionToggle.textContent).toBe('Add Mapping Instruction');
    fireEvent.click(actionToggle);

    const wrapFlyout = wrapper.getByTestId(`transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`);
    fireEvent.click(wrapFlyout.getElementsByTagName('button')[0]);

    const forEachItem = await wrapper.findByTestId('transformation-actions-foreach');
    fireEvent.click(forEachItem.getElementsByTagName('button')[0]);

    await waitFor(() => {
      expect(onUpdateSpy).toHaveBeenCalled();
    });
  });

  it('should apply If from the Add Mapping Instruction dropdown for the add mapping placeholder', async () => {
    const onUpdateSpy = vi.fn();
    const nodeData = new AddMappingNodeData(documentNodeData, targetDoc.fields[0].fields[3]);
    const spyOnApply = vi.spyOn(MappingActionService, 'applyIf');
    const wrapper = render(
      <MappingContextMenuAction nodeData={nodeData} dropdownLabel="Add Mapping Instruction" onUpdate={onUpdateSpy} />,
    );

    const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
    fireEvent.click(actionToggle);

    const wrapFlyout = wrapper.getByTestId(`transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`);
    fireEvent.click(wrapFlyout.getElementsByTagName('button')[0]);

    const ifItem = await wrapper.findByTestId('transformation-actions-if');
    fireEvent.click(ifItem.getElementsByTagName('button')[0]);

    await waitFor(() => {
      expect(onUpdateSpy).toHaveBeenCalled();
    });
    expect(spyOnApply).toHaveBeenCalledWith(nodeData);
  });

  it('should apply Choose from the Add Mapping Instruction dropdown for the add mapping placeholder', async () => {
    const onUpdateSpy = vi.fn();
    const nodeData = new AddMappingNodeData(documentNodeData, targetDoc.fields[0].fields[3]);
    const spyOnApply = vi.spyOn(MappingActionService, 'applyChooseWhenOtherwise');
    const wrapper = render(
      <MappingContextMenuAction nodeData={nodeData} dropdownLabel="Add Mapping Instruction" onUpdate={onUpdateSpy} />,
    );

    const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
    fireEvent.click(actionToggle);

    const wrapFlyout = wrapper.getByTestId(`transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`);
    fireEvent.click(wrapFlyout.getElementsByTagName('button')[0]);

    const chooseItem = await wrapper.findByTestId('transformation-actions-choose');
    fireEvent.click(chooseItem.getElementsByTagName('button')[0]);

    await waitFor(() => {
      expect(onUpdateSpy).toHaveBeenCalled();
    });
    expect(spyOnApply).toHaveBeenCalledWith(nodeData);
  });

  describe('Comment Functionality', () => {
    describe('Comment Dropdown Item Rendering', () => {
      it('should render comment dropdown item when nodeData has a mapping item', () => {
        const nodeData = new TargetFieldNodeData(
          documentNodeData,
          targetDoc.fields[0],
          new FieldItem(mappingTree, targetDoc.fields[0]),
        );
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        fireEvent.click(actionToggle);

        // Comment item should be visible
        expect(screen.getByTestId('transformation-actions-comment')).toBeInTheDocument();
      });

      it('should display "Edit Comment" when there is an existing comment', () => {
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        fieldItem.comment = 'Existing comment';
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        fireEvent.click(actionToggle);

        const commentItem = screen.getByTestId('transformation-actions-comment');
        expect(commentItem).toHaveTextContent('Edit Comment');
      });
    });

    describe('Comment Modal Opening', () => {
      it('should open CommentModal when comment dropdown item is clicked', async () => {
        const nodeData = new TargetFieldNodeData(
          documentNodeData,
          targetDoc.fields[0],
          new FieldItem(mappingTree, targetDoc.fields[0]),
        );
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        fireEvent.click(actionToggle);

        // Click the comment item
        const commentItem = screen.getByTestId('transformation-actions-comment');
        fireEvent.click(commentItem.getElementsByTagName('button')[0]);

        // Modal should be open
        await waitFor(() => {
          expect(screen.getByTestId('comment-modal')).toBeInTheDocument();
        });
      });
    });

    describe('CommentModal Rendering', () => {
      it('should render CommentModal when mappingItem exists', async () => {
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        fireEvent.click(actionToggle);

        // Click the comment item to open modal
        const commentItem = screen.getByTestId('transformation-actions-comment');
        fireEvent.click(commentItem.getElementsByTagName('button')[0]);

        await waitFor(() => {
          expect(screen.getByTestId('comment-modal')).toBeInTheDocument();
        });
      });

      it('should pass correct mapping to CommentModal', () => {
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        fieldItem.comment = 'Test comment';
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        fireEvent.click(actionToggle);

        // Click the comment item to open modal
        const commentItem = screen.getByTestId('transformation-actions-comment');
        fireEvent.click(commentItem.getElementsByTagName('button')[0]);

        // Modal should display the comment
        const textarea = screen.getByTestId('comment-textarea') as HTMLTextAreaElement;
        expect(textarea.value).toBe('Test comment');
      });
    });

    describe('CommentModal Closing', () => {
      it('should close CommentModal when handleCloseCommentModal is called', async () => {
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        fireEvent.click(actionToggle);

        // Click the comment item to open modal
        const commentItem = screen.getByTestId('transformation-actions-comment');
        fireEvent.click(commentItem.getElementsByTagName('button')[0]);

        expect(screen.getByTestId('comment-modal')).toBeInTheDocument();

        // Close the modal
        const cancelButton = screen.getByTestId('cancel-comment-btn');
        fireEvent.click(cancelButton);

        // Modal should be closed
        await waitFor(() => {
          expect(screen.queryByTestId('comment-modal')).not.toBeInTheDocument();
        });
      });
    });

    describe('Comment Modal Integration', () => {
      it('should update comment and close modal when Create is clicked', async () => {
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = vi.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        fireEvent.click(actionToggle);

        // Click the comment item to open modal
        const commentItem = screen.getByTestId('transformation-actions-comment');
        fireEvent.click(commentItem.getElementsByTagName('button')[0]);

        // Add a comment
        const textarea = screen.getByTestId('comment-textarea');
        fireEvent.change(textarea, { target: { value: 'New test comment' } });

        const createButton = screen.getByTestId('create-comment-btn');
        fireEvent.click(createButton);

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
      const forEachItem = new ForEachItem(mappingTree);
      const nodeData = new MappingNodeData(documentNodeData, forEachItem);
      const onUpdateMock = vi.fn();
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle);

      const sortItem = screen.getByTestId('transformation-actions-sort');
      fireEvent.click(sortItem.getElementsByTagName('button')[0]);

      await waitFor(() => {
        expect(screen.getByTestId('sort-modal')).toBeInTheDocument();
      });
    });

    it('should display "Edit Sort" when ForEachItem has existing sort items', () => {
      const forEachItem = new ForEachItem(mappingTree);
      const sort = new SortItem();
      sort.expression = 'Title';
      forEachItem.sortItems = [sort];
      const nodeData = new MappingNodeData(documentNodeData, forEachItem);
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle);

      const sortAction = screen.getByTestId('transformation-actions-sort');
      expect(sortAction).toHaveTextContent('Edit Sort');
    });
  });

  describe('Flyout Submenus', () => {
    it('should render "Wrap with Instruction" flyout when wrap actions are allowed', () => {
      const nodeData = new TargetFieldNodeData(
        documentNodeData,
        targetDoc.fields[0],
        new FieldItem(mappingTree, targetDoc.fields[0]),
      );
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle);

      expect(
        screen.getByTestId(`transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`),
      ).toBeInTheDocument();
    });

    it('should contain correct actions in "Wrap with Instruction" flyout', async () => {
      const nodeData = new TargetFieldNodeData(
        documentNodeData,
        targetDoc.fields[0],
        new FieldItem(mappingTree, targetDoc.fields[0]),
      );
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle);

      const wrapFlyout = screen.getByTestId(`transformation-actions-group-${MappingActionGroup.WrapWithInstruction}`);
      fireEvent.click(wrapFlyout.getElementsByTagName('button')[0]);

      expect(await screen.findByTestId('transformation-actions-if')).toBeInTheDocument();
      expect(screen.getByTestId('transformation-actions-choose')).toBeInTheDocument();
    });

    it('should contain correct actions in "Inner Instruction" flyout', async () => {
      const forEachItem = new ForEachItem(mappingTree);
      const nodeData = new MappingNodeData(documentNodeData, forEachItem);
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle);

      const innerFlyout = screen.getByTestId(`transformation-actions-group-${MappingActionGroup.InnerInstruction}`);
      fireEvent.click(innerFlyout.getElementsByTagName('button')[0]);

      expect(await screen.findByTestId('transformation-actions-foreach-inner')).toBeInTheDocument();
      expect(screen.getByTestId('transformation-actions-if-inner')).toBeInTheDocument();
      expect(screen.getByTestId('transformation-actions-choose-inner')).toBeInTheDocument();
    });

    it('should render ungrouped actions as direct top-level items', () => {
      const nodeData = new TargetFieldNodeData(
        documentNodeData,
        targetDoc.fields[0],
        new FieldItem(mappingTree, targetDoc.fields[0]),
      );
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle);

      expect(screen.getByTestId('transformation-actions-selector')).toBeInTheDocument();
      expect(screen.getByTestId('transformation-actions-comment')).toBeInTheDocument();
    });

    it('should not render flyout parent when all group actions are filtered out', () => {
      const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle);

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
});
