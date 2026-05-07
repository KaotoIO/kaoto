import { DraggableObject } from '@patternfly/react-drag-drop';
import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent } from 'react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../models/datamapper/document';
import { ChooseItem, FieldItem, ForEachItem, MappingTree } from '../../../../models/datamapper/mapping';
import {
  AddMappingNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../../../models/datamapper/visualization';
import { MappingService } from '../../../../services/mapping/mapping.service';
import { MappingActionService } from '../../../../services/visualization/mapping-action.service';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import { MappingContextMenuAction } from './MappingContextMenuAction';

jest.mock('@patternfly/react-drag-drop', () => ({
  DragDropSort: (({ items }: { items: DraggableObject[] }) => (
    <div data-testid="drag-drop-sort">
      {items.map((item) => (
        <div key={item.id}>{item.content}</div>
      ))}
    </div>
  )) as FunctionComponent<{ items: DraggableObject[] }>,
}));

jest.mock('../../../../hooks/useDataMapper', () => ({
  useDataMapper: jest.fn().mockReturnValue({
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
    jest.restoreAllMocks();
  });

  it('should apply ValueSelector', async () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(MappingActionService, 'applyValueSelector');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const selectorItem = screen.getByTestId('transformation-actions-selector');
    act(() => {
      fireEvent.click(selectorItem.getElementsByTagName('button')[0]);
    });
    await waitFor(() =>
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toEqual('false'),
    );
    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should apply If', async () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(MappingActionService, 'applyIf');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const ifItem = screen.getByTestId('transformation-actions-if');
    act(() => {
      fireEvent.click(ifItem.getElementsByTagName('button')[0]);
    });
    await waitFor(() =>
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toEqual('false'),
    );
    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should apply choose', async () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(MappingActionService, 'applyChooseWhenOtherwise');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const chooseItem = screen.getByTestId('transformation-actions-choose');
    act(() => {
      fireEvent.click(chooseItem.getElementsByTagName('button')[0]);
    });
    await waitFor(() =>
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toEqual('false'),
    );
    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should apply when', async () => {
    const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(MappingService, 'addWhen');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const whenItem = screen.getByTestId('transformation-actions-when');
    act(() => {
      fireEvent.click(whenItem.getElementsByTagName('button')[0]);
    });
    await waitFor(() =>
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toEqual('false'),
    );

    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should apply otherwise', async () => {
    const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(MappingService, 'addOtherwise');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const otherwiseItem = screen.getByTestId('transformation-actions-otherwise');
    act(() => {
      fireEvent.click(otherwiseItem.getElementsByTagName('button')[0]);
    });
    await waitFor(() =>
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toEqual('false'),
    );

    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should apply for-each', async () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0].fields[3],
      new FieldItem(mappingTree, targetDoc.fields[0].fields[3]),
    );
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(MappingActionService, 'applyForEach');
    render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const foreachItem = screen.getByTestId('transformation-actions-foreach');
    act(() => {
      fireEvent.click(foreachItem.getElementsByTagName('button')[0]);
    });
    await waitFor(() =>
      expect(screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded')).toEqual('false'),
    );
    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
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
    const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');

    act(() => {
      fireEvent(actionToggle, clickEvent);
    });

    await waitFor(() => expect(stopPropagationSpy).toHaveBeenCalled());
  });

  it('should stop event propagation upon selecting a menu option', async () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0].fields[3],
      new FieldItem(mappingTree, targetDoc.fields[0].fields[3]),
    );

    const wrapper = render(<MappingContextMenuAction nodeData={nodeData} onUpdate={() => {}} />);

    act(() => {
      fireEvent.click(wrapper.getByTestId('transformation-actions-menu-toggle'));
    });

    const selectorButton = wrapper.getByTestId('transformation-actions-selector').getElementsByTagName('button')[0];
    const clickEvent = createEvent.click(selectorButton);
    const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');

    act(() => {
      fireEvent(selectorButton, clickEvent);
    });

    await waitFor(() => expect(stopPropagationSpy).toHaveBeenCalled());
  });

  it('should render Add Conditional Mapping dropdown for the add mapping placeholder', async () => {
    const onUpdateSpy = jest.fn();
    const nodeData = new AddMappingNodeData(documentNodeData, targetDoc.fields[0].fields[3]);
    const wrapper = render(
      <MappingContextMenuAction nodeData={nodeData} dropdownLabel="Add Conditional Mapping" onUpdate={onUpdateSpy} />,
    );

    act(() => {
      const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
      expect(actionToggle.textContent).toEqual('Add Conditional Mapping');
      fireEvent.click(actionToggle);
    });

    act(() => {
      const forEachList = wrapper.getByTestId('transformation-actions-foreach');
      const forEachButton = forEachList.getElementsByTagName('button');
      fireEvent.click(forEachButton[0]);
    });

    await waitFor(() => expect(onUpdateSpy).toHaveBeenCalled());
  });

  it('should apply If from the Add Conditional Mapping dropdown for the add mapping placeholder', async () => {
    const onUpdateSpy = jest.fn();
    const nodeData = new AddMappingNodeData(documentNodeData, targetDoc.fields[0].fields[3]);
    const spyOnApply = jest.spyOn(MappingActionService, 'applyIf');
    const wrapper = render(
      <MappingContextMenuAction nodeData={nodeData} dropdownLabel="Add Conditional Mapping" onUpdate={onUpdateSpy} />,
    );

    act(() => {
      const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle);
    });

    act(() => {
      const ifItem = wrapper.getByTestId('transformation-actions-if');
      const ifButton = ifItem.getElementsByTagName('button');
      fireEvent.click(ifButton[0]);
    });

    await waitFor(() => expect(onUpdateSpy).toHaveBeenCalled());
    expect(spyOnApply).toHaveBeenCalledWith(nodeData);
  });

  it('should apply Choose from the Add Conditional Mapping dropdown for the add mapping placeholder', async () => {
    const onUpdateSpy = jest.fn();
    const nodeData = new AddMappingNodeData(documentNodeData, targetDoc.fields[0].fields[3]);
    const spyOnApply = jest.spyOn(MappingActionService, 'applyChooseWhenOtherwise');
    const wrapper = render(
      <MappingContextMenuAction nodeData={nodeData} dropdownLabel="Add Conditional Mapping" onUpdate={onUpdateSpy} />,
    );

    act(() => {
      const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle);
    });

    act(() => {
      const chooseItem = wrapper.getByTestId('transformation-actions-choose');
      const chooseButton = chooseItem.getElementsByTagName('button');
      fireEvent.click(chooseButton[0]);
    });

    await waitFor(() => expect(onUpdateSpy).toHaveBeenCalled());
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
        const onUpdateMock = jest.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        act(() => {
          fireEvent.click(actionToggle);
        });

        // Comment item should be visible
        expect(screen.getByTestId('transformation-actions-comment')).toBeInTheDocument();
      });

      it('should display "Edit Comment" when there is an existing comment', () => {
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        fieldItem.comment = 'Existing comment';
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = jest.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        act(() => {
          fireEvent.click(actionToggle);
        });

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
        const onUpdateMock = jest.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        act(() => {
          fireEvent.click(actionToggle);
        });

        // Click the comment item
        const commentItem = screen.getByTestId('transformation-actions-comment');
        act(() => {
          fireEvent.click(commentItem.getElementsByTagName('button')[0]);
        });

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
        const onUpdateMock = jest.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        act(() => {
          fireEvent.click(actionToggle);
        });

        // Click the comment item to open modal
        const commentItem = screen.getByTestId('transformation-actions-comment');
        act(() => {
          fireEvent.click(commentItem.getElementsByTagName('button')[0]);
        });

        await waitFor(() => {
          expect(screen.getByTestId('comment-modal')).toBeInTheDocument();
        });
      });

      it('should pass correct mapping to CommentModal', () => {
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        fieldItem.comment = 'Test comment';
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = jest.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        act(() => {
          fireEvent.click(actionToggle);
        });

        // Click the comment item to open modal
        const commentItem = screen.getByTestId('transformation-actions-comment');
        act(() => {
          fireEvent.click(commentItem.getElementsByTagName('button')[0]);
        });

        // Modal should display the comment
        const textarea = screen.getByTestId('comment-textarea') as HTMLTextAreaElement;
        expect(textarea.value).toBe('Test comment');
      });
    });

    describe('CommentModal Closing', () => {
      it('should close CommentModal when handleCloseCommentModal is called', async () => {
        const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
        const nodeData = new TargetFieldNodeData(documentNodeData, targetDoc.fields[0], fieldItem);
        const onUpdateMock = jest.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        act(() => {
          fireEvent.click(actionToggle);
        });

        // Click the comment item to open modal
        const commentItem = screen.getByTestId('transformation-actions-comment');
        act(() => {
          fireEvent.click(commentItem.getElementsByTagName('button')[0]);
        });

        expect(screen.getByTestId('comment-modal')).toBeInTheDocument();

        // Close the modal
        const cancelButton = screen.getByTestId('cancel-comment-btn');
        act(() => {
          fireEvent.click(cancelButton);
        });

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
        const onUpdateMock = jest.fn();
        render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

        // Open the dropdown menu
        const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
        act(() => {
          fireEvent.click(actionToggle);
        });

        // Click the comment item to open modal
        const commentItem = screen.getByTestId('transformation-actions-comment');
        act(() => {
          fireEvent.click(commentItem.getElementsByTagName('button')[0]);
        });

        // Add a comment
        const textarea = screen.getByTestId('comment-textarea');
        act(() => {
          fireEvent.change(textarea, { target: { value: 'New test comment' } });
        });

        const createButton = screen.getByTestId('create-comment-btn');
        act(() => {
          fireEvent.click(createButton);
        });

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
      const onUpdateMock = jest.fn();
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      act(() => {
        fireEvent.click(actionToggle);
      });

      const sortItem = screen.getByTestId('transformation-actions-sort');
      act(() => {
        fireEvent.click(sortItem.getElementsByTagName('button')[0]);
      });

      await waitFor(() => {
        expect(screen.getByTestId('sort-modal')).toBeInTheDocument();
      });
    });

    it('should display "Edit Sort" when ForEachItem has existing sort items', () => {
      const forEachItem = new ForEachItem(mappingTree);
      const sort = { expression: 'Title', order: 'ascending' as const };
      forEachItem.sortItems = [sort];
      const nodeData = new MappingNodeData(documentNodeData, forEachItem);
      render(<MappingContextMenuAction nodeData={nodeData} onUpdate={jest.fn()} />);

      const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
      act(() => {
        fireEvent.click(actionToggle);
      });

      const sortAction = screen.getByTestId('transformation-actions-sort');
      expect(sortAction).toHaveTextContent('Edit Sort');
    });
  });
});
