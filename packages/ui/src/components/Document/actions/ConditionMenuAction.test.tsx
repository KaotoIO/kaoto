import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BODY_DOCUMENT_ID } from '../../../models/datamapper/document';
import { ChooseItem, FieldItem, MappingTree } from '../../../models/datamapper/mapping';
import { DocumentType } from '../../../models/datamapper/path';
import {
  AddMappingNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../../models/datamapper/visualization';
import { MappingService } from '../../../services/mapping.service';
import { VisualizationService } from '../../../services/visualization.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { ConditionMenuAction } from './ConditionMenuAction';

describe('ConditionMenuAction', () => {
  const targetDoc = TestUtil.createTargetOrderDoc();
  const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
  const documentNodeData = new TargetDocumentNodeData(targetDoc, mappingTree);

  it('should apply ValueSelector', () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(VisualizationService, 'applyValueSelector');
    render(<ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const selectorItem = screen.getByTestId('transformation-actions-selector');
    act(() => {
      fireEvent.click(selectorItem.getElementsByTagName('button')[0]);
    });
    waitFor(() => screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded') === 'false');
    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should apply If', () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(VisualizationService, 'applyIf');
    render(<ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const ifItem = screen.getByTestId('transformation-actions-if');
    act(() => {
      fireEvent.click(ifItem.getElementsByTagName('button')[0]);
    });
    waitFor(() => screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded') === 'false');
    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should apply choose', () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0],
      new FieldItem(mappingTree, targetDoc.fields[0]),
    );
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(VisualizationService, 'applyChooseWhenOtherwise');
    render(<ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const chooseItem = screen.getByTestId('transformation-actions-choose');
    act(() => {
      fireEvent.click(chooseItem.getElementsByTagName('button')[0]);
    });
    waitFor(() => screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded') === 'false');
    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should apply when', () => {
    const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(MappingService, 'addWhen');
    render(<ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const whenItem = screen.getByTestId('transformation-actions-when');
    act(() => {
      fireEvent.click(whenItem.getElementsByTagName('button')[0]);
    });
    waitFor(() => screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded') === 'false');

    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should apply otherwise', () => {
    const nodeData = new MappingNodeData(documentNodeData, new ChooseItem(mappingTree, targetDoc.fields[0]));
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(MappingService, 'addOtherwise');
    render(<ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const otherwiseItem = screen.getByTestId('transformation-actions-otherwise');
    act(() => {
      fireEvent.click(otherwiseItem.getElementsByTagName('button')[0]);
    });
    waitFor(() => screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded') === 'false');

    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should apply for-each', () => {
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0].fields[3],
      new FieldItem(mappingTree, targetDoc.fields[0].fields[3]),
    );
    const onUpdateMock = jest.fn();
    const spyOnApply = jest.spyOn(VisualizationService, 'applyForEach');
    render(<ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />);
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });
    const foreachItem = screen.getByTestId('transformation-actions-foreach');
    act(() => {
      fireEvent.click(foreachItem.getElementsByTagName('button')[0]);
    });
    waitFor(() => screen.getByTestId('transformation-actions-menu-toggle').getAttribute('aria-expanded') === 'false');
    expect(onUpdateMock.mock.calls.length).toEqual(1);
    expect(spyOnApply.mock.calls.length).toEqual(1);
  });

  it('should stop event propagation upon context menu toggle', () => {
    const stopPropagationSpy = jest.fn();
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0].fields[3],
      new FieldItem(mappingTree, targetDoc.fields[0].fields[3]),
    );

    const wrapper = render(<ConditionMenuAction nodeData={nodeData} onUpdate={() => {}} />);

    act(() => {
      const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle, { stopPropagation: stopPropagationSpy });
    });

    waitFor(() => expect(stopPropagationSpy).toHaveBeenCalled());
  });

  it('should stop event propagation upon selecting a menu option', () => {
    const stopPropagationSpy = jest.fn();
    const nodeData = new TargetFieldNodeData(
      documentNodeData,
      targetDoc.fields[0].fields[3],
      new FieldItem(mappingTree, targetDoc.fields[0].fields[3]),
    );

    const wrapper = render(<ConditionMenuAction nodeData={nodeData} onUpdate={() => {}} />);

    act(() => {
      const actionToggle = wrapper.getByTestId('transformation-actions-menu-toggle');
      fireEvent.click(actionToggle, { stopPropagation: jest.fn() });
    });

    act(() => {
      const selectorOption = wrapper.getByTestId('transformation-actions-selector');
      fireEvent.click(selectorOption, { stopPropagation: stopPropagationSpy });
    });

    waitFor(() => expect(stopPropagationSpy).toHaveBeenCalled());
  });

  it('should render Add Conditional Mapping dropdown for the add mapping placeholder', async () => {
    const onUpdateSpy = jest.fn();
    const nodeData = new AddMappingNodeData(documentNodeData, targetDoc.fields[0].fields[3]);
    const wrapper = render(
      <ConditionMenuAction nodeData={nodeData} dropdownLabel="Add Conditional Mapping" onUpdate={onUpdateSpy} />,
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
});
