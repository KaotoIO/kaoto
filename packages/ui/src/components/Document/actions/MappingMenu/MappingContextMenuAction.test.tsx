import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
import { useDocumentTreeStore } from '../../../../store/document-tree.store';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import {
  createDataMapperContext,
  createDataMapperContextWrapper,
} from '../../../../stubs/datamapper/data-mapper-context';
import { MappingContextMenuAction } from './MappingContextMenuAction';

describe('MappingContextMenuAction', () => {
  let targetDoc: ReturnType<typeof TestUtil.createTargetOrderDoc>;
  let mappingTree: MappingTree;
  let documentNodeData: TargetDocumentNodeData;
  let dataMapperWrapper: ReturnType<typeof createDataMapperContextWrapper>;

  beforeEach(() => {
    targetDoc = TestUtil.createTargetOrderDoc();
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    documentNodeData = new TargetDocumentNodeData(targetDoc, mappingTree);
    dataMapperWrapper = createDataMapperContextWrapper(createDataMapperContext({ mappingTree }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    act(() => {
      useDocumentTreeStore.getState().setOpenMappingMenuId(null);
    });
  });

  it('should apply ValueSelector', async () => {
    const user = userEvent.setup();
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingActionService, 'applyValueOfSelector');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, { wrapper: dataMapperWrapper });
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

  it('should apply If', async () => {
    const user = userEvent.setup();
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = vi.fn();
    const spyOnApply = vi.spyOn(MappingActionService, 'applyIf');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, { wrapper: dataMapperWrapper });
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
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, { wrapper: dataMapperWrapper });
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
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, { wrapper: dataMapperWrapper });
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
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, { wrapper: dataMapperWrapper });
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
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, { wrapper: dataMapperWrapper });
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

    const wrapper = render(<MappingContextMenuAction nodeData={nodeData} onUpdate={() => {}} />, {
      wrapper: dataMapperWrapper,
    });

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
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0].fields[3],
      new FieldItem(mappingTree, targetDoc.fields[0].fields[3]),
    );

    const wrapper = render(<MappingContextMenuAction nodeData={nodeData} onUpdate={() => {}} />, {
      wrapper: dataMapperWrapper,
    });

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
      { wrapper: dataMapperWrapper },
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
      { wrapper: dataMapperWrapper },
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
      { wrapper: dataMapperWrapper },
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
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, {
          wrapper: dataMapperWrapper,
        });

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
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, {
          wrapper: dataMapperWrapper,
        });

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
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, {
          wrapper: dataMapperWrapper,
        });

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
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, {
          wrapper: dataMapperWrapper,
        });

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
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, {
          wrapper: dataMapperWrapper,
        });

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
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, {
          wrapper: dataMapperWrapper,
        });

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
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, {
          wrapper: dataMapperWrapper,
        });

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
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />, { wrapper: dataMapperWrapper });

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
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />, { wrapper: dataMapperWrapper });

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      await user.click(actionToggle);

      const sortAction = await screen.findByTestId('transformation-actions-sort');
      expect(sortAction).toHaveTextContent('Edit Sort');
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
        { wrapper: dataMapperWrapper },
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

  describe('Flyout Submenus', () => {
    it('should render "Wrap with Instruction" flyout when wrap actions are allowed', async () => {
      const user = userEvent.setup();
      const nodeData = new TargetFieldNodeData(
        documentNodeData,
        targetDoc.fields[0],
        new FieldItem(mappingTree, targetDoc.fields[0]),
      );
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />, { wrapper: dataMapperWrapper });

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
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />, { wrapper: dataMapperWrapper });

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
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />, { wrapper: dataMapperWrapper });

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
      const nodeData = new TargetFieldNodeData(
        documentNodeData,
        targetDoc.fields[0],
        new FieldItem(mappingTree, targetDoc.fields[0]),
      );
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />, { wrapper: dataMapperWrapper });

      const actionToggle = await screen.findByTestId('transformation-actions-menu-toggle');
      await user.click(actionToggle);

      expect(await screen.findByTestId('transformation-actions-selector')).toBeInTheDocument();
      expect(await screen.findByTestId('transformation-actions-comment')).toBeInTheDocument();
    });

    it('should not render flyout parent when all group actions are filtered out', async () => {
      const user = userEvent.setup();
      const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={vi.fn()} />, { wrapper: dataMapperWrapper });

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
});
