import { XPathInputAction } from './XPathInputAction';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { BODY_DOCUMENT_ID } from '../../../models/datamapper/document';
import { DocumentType } from '../../../models/datamapper/path';

describe('XPathInputAction', () => {
  it('should update xpath', () => {
    const tree = new MappingTree(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    const mapping = new ValueSelector(tree);
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
});
