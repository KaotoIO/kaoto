import { XPathInputAction } from './XPathInputAction';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { BODY_DOCUMENT_ID } from '../../../models/datamapper/document';
import { DocumentType } from '../../../models/datamapper/path';

describe('XPathInputAction', () => {
  let tree: MappingTree;
  let mapping: ValueSelector;

  beforeEach(() => {
    tree = new MappingTree(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
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
});
