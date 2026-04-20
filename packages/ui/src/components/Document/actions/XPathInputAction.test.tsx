import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { XPathInputAction } from './XPathInputAction';

describe('XPathInputAction', () => {
  let tree: MappingTree;
  let mapping: ValueSelector;

  beforeEach(() => {
    tree = new MappingTree(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    mapping = new ValueSelector(tree);
  });

  it('should update xpath', () => {
    const onUpdateMock = jest.fn();
    render(<XPathInputAction mapping={mapping} onUpdate={onUpdateMock} />);
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
    render(<XPathInputAction mapping={mapping} onUpdate={onUpdateMock} />);
    const btn = await screen.findByTestId('xpath-input-error-btn');
    expect(btn).toBeInTheDocument();
  });

  it('should stop event propagation on handleXPathChange', () => {
    const stopPropagationSpy = jest.fn();
    const wrapper = render(<XPathInputAction mapping={mapping} onUpdate={jest.fn()} />);

    act(() => {
      const input = wrapper.getByTestId('transformation-xpath-input');
      fireEvent.change(input, { target: { value: '/ShipOrder' }, stopPropagation: stopPropagationSpy });
    });

    waitFor(() => expect(stopPropagationSpy).toHaveBeenCalled());
  });

  it('should focus input on mount when expression is empty', async () => {
    const emptyMapping = { ...mapping, expression: '' };
    render(<XPathInputAction mapping={emptyMapping} onUpdate={jest.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');

    expect(input).toHaveFocus();
  });

  it('should NOT focus input on mount if expression already exists', async () => {
    const filledMapping = { ...mapping, expression: 'existing/xpath' };
    render(<XPathInputAction mapping={filledMapping} onUpdate={jest.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');

    expect(input).not.toHaveFocus();
  });

  it('should only focus once and respect the hasFocusedRef guard', async () => {
    const emptyMapping = { ...mapping, expression: '' };
    const { rerender } = render(<XPathInputAction mapping={emptyMapping} onUpdate={jest.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');
    expect(input).toHaveFocus();

    act(() => {
      input.blur();
    });
    expect(input).not.toHaveFocus();

    rerender(<XPathInputAction mapping={emptyMapping} onUpdate={jest.fn()} />);

    expect(input).not.toHaveFocus();
  });

  it('should not focus when expression changes if already focused once', async () => {
    const emptyMapping = { ...mapping, expression: '' };
    const { rerender } = render(<XPathInputAction mapping={emptyMapping} onUpdate={jest.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');
    expect(input).toHaveFocus();

    act(() => {
      input.blur();
    });

    const newMapping = { ...mapping, expression: 'new/path' };
    rerender(<XPathInputAction mapping={newMapping} onUpdate={jest.fn()} />);

    expect(input).not.toHaveFocus();
  });
});
