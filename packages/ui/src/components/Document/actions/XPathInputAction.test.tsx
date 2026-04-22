import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { XmlSchemaDocument } from '../../../services/xml-schema-document.model';
import { useDocumentTreeStore } from '../../../store/document-tree.store';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { XPathInputAction } from './XPathInputAction';

describe('XPathInputAction', () => {
  let tree: MappingTree;
  let mapping: ValueSelector;
  let doc: XmlSchemaDocument;
  let docData: TargetDocumentNodeData;

  beforeEach(() => {
    doc = TestUtil.createTargetOrderDoc();
    tree = new MappingTree(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    mapping = new ValueSelector(tree);
    docData = new TargetDocumentNodeData(doc, tree);
    // Reset store state before each test
    useDocumentTreeStore.getState().clearXPathInputFocusRequest();
  });

  it('should update xpath', () => {
    const onUpdateMock = jest.fn();
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={onUpdateMock} />);
    expect(mapping.expression).toBeFalsy();
    const input = screen.getByTestId('transformation-xpath-input');
    act(() => {
      fireEvent.change(input, { target: { value: '/ShipOrder' } });
    });
    expect(mapping.expression).toEqual('/ShipOrder');
    expect(onUpdateMock.mock.calls.length).toEqual(1);
  });

  it('should show error popover button if xpath has a parse error', async () => {
    mapping.expression = '{{';
    const onUpdateMock = jest.fn();
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={onUpdateMock} />);
    const btn = await screen.findByTestId('xpath-input-error-btn');
    expect(btn).toBeInTheDocument();
  });

  it('should stop event propagation on handleXPathChange', () => {
    const stopPropagationSpy = jest.fn();
    const wrapper = render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={jest.fn()} />);

    act(() => {
      const input = wrapper.getByTestId('transformation-xpath-input');
      fireEvent.change(input, { target: { value: '/ShipOrder' }, stopPropagation: stopPropagationSpy });
    });

    waitFor(() => expect(stopPropagationSpy).toHaveBeenCalled());
  });

  it('should focus input when store indicates focus is needed for mapping node path', async () => {
    mapping.expression = '';

    // Request focus using the tree's nodePath (which is what nodeData.mapping.nodePath refers to)
    useDocumentTreeStore.getState().requestXPathInputFocus(tree.nodePath.toString());

    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={jest.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');

    expect(input).toHaveFocus();
    expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBeNull();
  });

  it('should NOT focus input when store does not indicate focus', async () => {
    mapping.expression = 'existing/xpath';

    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={jest.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');

    expect(input).not.toHaveFocus();
  });

  it('should only focus when store flag is set', async () => {
    mapping.expression = '';

    useDocumentTreeStore.getState().requestXPathInputFocus(tree.nodePath.toString());

    const { rerender } = render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={jest.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');
    expect(input).toHaveFocus();

    act(() => {
      input.blur();
    });
    expect(input).not.toHaveFocus();

    rerender(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={jest.fn()} />);

    expect(input).not.toHaveFocus();
  });

  it('should not focus when expression changes without store flag', async () => {
    mapping.expression = '';

    useDocumentTreeStore.getState().requestXPathInputFocus(tree.nodePath.toString());

    const { rerender } = render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={jest.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');
    expect(input).toHaveFocus();

    act(() => {
      input.blur();
    });

    mapping.expression = 'new/path';
    rerender(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={jest.fn()} />);

    expect(input).not.toHaveFocus();
  });
});
